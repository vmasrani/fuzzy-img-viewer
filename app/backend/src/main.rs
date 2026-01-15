mod parser;
mod thumbnail;

use axum::{
    body::Body,
    extract::{Path as AxumPath, Query, State},
    http::{header, StatusCode},
    response::{Json, Response},
    routing::{get, post},
    Router,
};
use tokio_util::io::ReaderStream;
use parser::{parse_filename, ImageMetadata};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use thumbnail::{get_file_mtime, ThumbnailCache};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use ignore::WalkBuilder;

#[derive(Clone)]
struct AppState {
    thumbnail_cache: Arc<ThumbnailCache>,
    initial_folder: Arc<RwLock<Option<String>>>,
    initial_images: Arc<RwLock<Option<Vec<ImageRecord>>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageRecord {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub parent_path: String,
    pub metadata: ImageMetadata,
    pub mtime: u64,
    pub size_bytes: u64,
    pub search_key: String,
}

#[derive(Deserialize)]
struct ScanFolderRequest {
    folder_path: String,
}

#[derive(Deserialize)]
struct EnsureThumbnailsRequest {
    paths_and_mtimes: Vec<(String, u64)>,
    size: u32,
}

#[derive(Serialize)]
struct FolderListResponse {
    folders: Vec<String>,
}

#[derive(Serialize, Clone)]
struct DiscoveredFolder {
    path: String,
    name: String,
    image_count: usize,
    depth: usize,
}

#[derive(Serialize)]
struct DiscoverFoldersResponse {
    root: String,
    folders: Vec<DiscoveredFolder>,
}

#[derive(Deserialize)]
struct DiscoverFoldersQuery {
    root: String,
}

#[derive(Serialize)]
struct InitialDataResponse {
    folder_path: Option<String>,
    images: Option<Vec<ImageRecord>>,
}

// Get initial folder and images if provided via CLI
async fn get_initial_data(State(state): State<AppState>) -> Json<InitialDataResponse> {
    let folder_path = state.initial_folder.read().unwrap().clone();
    let images = state.initial_images.read().unwrap().clone();

    Json(InitialDataResponse {
        folder_path,
        images,
    })
}

// List folders in a given directory (or home directory by default)
async fn list_folders(Query(params): Query<std::collections::HashMap<String, String>>) -> Json<FolderListResponse> {
    let base_path = params
        .get("path")
        .map(|s| PathBuf::from(s))
        .unwrap_or_else(|| {
            dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
        });

    let mut folders = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&base_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    folders.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    folders.sort();
    Json(FolderListResponse { folders })
}

// Check if a file is an image based on extension
fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| matches!(ext.to_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif"))
        .unwrap_or(false)
}

// Count images in a directory (non-recursive)
fn count_images_in_dir(path: &Path) -> usize {
    std::fs::read_dir(path)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_file() && is_image_file(&e.path()))
                .count()
        })
        .unwrap_or(0)
}

// Discover ALL folders under a root path recursively
async fn discover_folders(Query(params): Query<DiscoverFoldersQuery>) -> Result<Json<DiscoverFoldersResponse>, StatusCode> {
    let root = PathBuf::from(&params.root);

    if !root.exists() || !root.is_dir() {
        return Err(StatusCode::NOT_FOUND);
    }

    let root_str = params.root.clone();

    let result = tokio::task::spawn_blocking(move || {
        let mut folders = Vec::new();

        // Use WalkBuilder to recursively find all directories
        let walker = WalkBuilder::new(&root)
            .max_depth(Some(MAX_SCAN_DEPTH))
            .follow_links(false)
            .git_ignore(false)
            .hidden(true)  // Skip hidden directories
            .build();

        for entry in walker.filter_map(|e| e.ok()) {
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }

            let name = entry_path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();

            // Skip hidden folders (except root itself)
            if name.starts_with('.') && entry_path != root {
                continue;
            }

            let image_count = count_images_in_dir(entry_path);
            let depth = entry_path
                .strip_prefix(&root)
                .map(|p| p.components().count())
                .unwrap_or(0);

            folders.push(DiscoveredFolder {
                path: entry_path.to_string_lossy().to_string(),
                name,
                image_count,
                depth,
            });
        }

        // Sort by path for consistent ordering
        folders.sort_by(|a, b| a.path.cmp(&b.path));

        DiscoverFoldersResponse {
            root: root_str,
            folders,
        }
    })
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(result))
}

const MAX_SCAN_DEPTH: usize = 10;
const MAX_IMAGE_COUNT: usize = 50_000;

// Helper function to scan a folder and return image records
fn scan_folder_path(path: &Path) -> Result<Vec<ImageRecord>, String> {
    if !path.exists() || !path.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path.display()));
    }

    let mut records = Vec::new();

    let walker = WalkBuilder::new(path)
        .max_depth(Some(MAX_SCAN_DEPTH))
        .follow_links(false)
        .git_ignore(false)
        .hidden(false)
        .build();

    for entry in walker.filter_map(|e| e.ok()) {
        if records.len() >= MAX_IMAGE_COUNT {
            eprintln!("⚠️  Reached maximum image count ({}), stopping scan", MAX_IMAGE_COUNT);
            break;
        }

        let entry_path = entry.path();
        if !entry_path.is_file() {
            continue;
        }

        let extension = entry_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        if !matches!(extension.to_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
            continue;
        }

        let filename = entry_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        let parent_path = entry_path
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let metadata = parse_filename(&filename);

        let file_metadata = match std::fs::metadata(entry_path) {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Failed to get metadata for {}: {}", entry_path.display(), e);
                continue;
            }
        };
        let mtime = get_file_mtime(entry_path);
        let size_bytes = file_metadata.len();

        let search_key = format!(
            "{} {} {} {} {} {} {}",
            filename,
            metadata.date.as_deref().unwrap_or(""),
            metadata.subject.as_deref().unwrap_or(""),
            metadata.series.as_deref().unwrap_or(""),
            metadata.a.map(|n| n.to_string()).unwrap_or_default(),
            metadata.b.map(|n| n.to_string()).unwrap_or_default(),
            metadata.frame.map(|n| n.to_string()).unwrap_or_default(),
        )
        .to_lowercase();

        let id = format!("{}_{}", entry_path.to_string_lossy(), mtime);

        records.push(ImageRecord {
            id,
            path: entry_path.to_string_lossy().to_string(),
            filename,
            parent_path,
            metadata,
            mtime,
            size_bytes,
            search_key,
        });
    }

    Ok(records)
}

// Scan a folder for images
async fn scan_folder(Json(req): Json<ScanFolderRequest>) -> Result<Json<Vec<ImageRecord>>, StatusCode> {
    let path = PathBuf::from(&req.folder_path);

    let result = tokio::task::spawn_blocking(move || scan_folder_path(&path))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match result {
        Ok(records) => Ok(Json(records)),
        Err(_) => Err(StatusCode::BAD_REQUEST),
    }
}

// Ensure thumbnails exist and return their paths
async fn ensure_thumbnails(
    State(state): State<AppState>,
    Json(req): Json<EnsureThumbnailsRequest>,
) -> Json<Vec<(String, String)>> {
    let paths: Vec<(PathBuf, u64)> = req
        .paths_and_mtimes
        .into_iter()
        .map(|(p, m)| (PathBuf::from(p), m))
        .collect();

    let results = state.thumbnail_cache.ensure_thumbnails_batch(paths, req.size);
    Json(results)
}

// Serve individual images by path (streamed for memory efficiency)
async fn serve_image(AxumPath(path): AxumPath<String>) -> Result<Response, StatusCode> {
    let decoded_path = urlencoding::decode(&path).map_err(|_| StatusCode::BAD_REQUEST)?;
    let file_path = PathBuf::from(decoded_path.as_ref());

    if !file_path.exists() || !file_path.is_file() {
        return Err(StatusCode::NOT_FOUND);
    }

    let file = tokio::fs::File::open(&file_path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let mime_type = mime_guess::from_path(&file_path)
        .first_or_octet_stream()
        .to_string();

    Ok(Response::builder()
        .header(header::CONTENT_TYPE, mime_type)
        .body(body)
        .unwrap())
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Parse command line arguments
    let args: Vec<String> = std::env::args().collect();
    let folder_path = if args.len() > 1 {
        Some(args[1].clone())
    } else {
        None
    };

    // Scan initial folder if provided
    let (initial_folder, initial_images) = if let Some(ref path) = folder_path {
        println!("📁 Scanning initial folder: {}", path);
        match scan_folder_path(Path::new(path)) {
            Ok(images) => {
                println!("✅ Found {} images", images.len());
                (Some(path.clone()), Some(images))
            }
            Err(e) => {
                eprintln!("❌ Failed to scan folder: {}", e);
                eprintln!("   Continuing without initial folder...");
                (None, None)
            }
        }
    } else {
        println!("ℹ️  No folder path provided. Use: cargo run <folder_path>");
        (None, None)
    };

    // Create thumbnail cache directory
    let cache_dir = dirs::cache_dir()
        .unwrap_or_else(|| PathBuf::from(".cache"))
        .join("fuzzy-img-viewer")
        .join("thumbs");

    let thumbnail_cache = ThumbnailCache::new(cache_dir).expect("Failed to create thumbnail cache");

    let state = AppState {
        thumbnail_cache: Arc::new(thumbnail_cache),
        initial_folder: Arc::new(RwLock::new(initial_folder)),
        initial_images: Arc::new(RwLock::new(initial_images)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Determine static file directory (for production, it's relative to the binary)
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_path_buf()));

    let static_dir = exe_dir
        .as_ref()
        .map(|dir| dir.join("../dist"))  // npm install: binary in bin/, dist in dist/
        .and_then(|path| path.canonicalize().ok())
        .or_else(|| PathBuf::from("dist").canonicalize().ok())
        .or_else(|| PathBuf::from("../dist").canonicalize().ok());

    let mut app = Router::new()
        .route("/api/initial", get(get_initial_data))
        .route("/api/folders", get(list_folders))
        .route("/api/discover-folders", get(discover_folders))
        .route("/api/scan", post(scan_folder))
        .route("/api/thumbnails", post(ensure_thumbnails))
        .route("/api/image/*path", get(serve_image))
        .with_state(state)
        .layer(cors);

    // Serve static files if dist directory exists
    if let Some(ref dir) = static_dir {
        if dir.exists() {
            println!("📦 Serving static files from: {}", dir.display());
            app = app.fallback_service(ServeDir::new(dir));
        } else {
            println!("⚠️  Static files directory not found: {}", dir.display());
            println!("   API-only mode (expecting separate frontend server)");
        }
    } else {
        println!("ℹ️  Development mode: API server only");
    }

    let addr = "127.0.0.1:3000";
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| {
            eprintln!("❌ Failed to bind to {}: {}", addr, e);
            eprintln!("   Try: lsof -i :3000 | grep LISTEN");
            eprintln!("   Kill: kill -9 <PID>");
            std::process::exit(1);
        });

    if static_dir.as_ref().map_or(false, |d| d.exists()) {
        println!("🚀 Fuzzy Image Viewer running on http://localhost:3000");
    } else {
        println!("🔌 API server ready");
    }

    axum::serve(listener, app).await.unwrap();
}

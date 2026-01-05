mod parser;
mod thumbnail;

use axum::{
    extract::{Path as AxumPath, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use parser::{parse_filename, ImageMetadata};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use thumbnail::{get_file_mtime, ThumbnailCache};
use tower_http::cors::{Any, CorsLayer};
use walkdir::WalkDir;

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

// Helper function to scan a folder and return image records
fn scan_folder_path(path: &Path) -> Result<Vec<ImageRecord>, String> {
    if !path.exists() || !path.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path.display()));
    }

    let mut records = Vec::new();

    for entry in WalkDir::new(path)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        if !entry_path.is_file() {
            continue;
        }

        let extension = entry_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        if !matches!(extension.to_lowercase().as_str(), "png" | "jpg" | "jpeg") {
            continue;
        }

        let filename = entry_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

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
    let path = Path::new(&req.folder_path);

    match scan_folder_path(path) {
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

// Serve individual images by path
async fn serve_image(AxumPath(path): AxumPath<String>) -> Result<Response, StatusCode> {
    // Decode the path (it comes URL-encoded)
    let decoded_path = urlencoding::decode(&path).map_err(|_| StatusCode::BAD_REQUEST)?;
    let file_path = Path::new(decoded_path.as_ref());

    if !file_path.exists() || !file_path.is_file() {
        return Err(StatusCode::NOT_FOUND);
    }

    let content = tokio::fs::read(file_path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mime_type = mime_guess::from_path(file_path)
        .first_or_octet_stream()
        .to_string();

    Ok(([(header::CONTENT_TYPE, mime_type)], content).into_response())
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
        .join("aquaeye-viz")
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

    let app = Router::new()
        .route("/api/initial", get(get_initial_data))
        .route("/api/folders", get(list_folders))
        .route("/api/scan", post(scan_folder))
        .route("/api/thumbnails", post(ensure_thumbnails))
        .route("/api/image/*path", get(serve_image))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();

    println!("🚀 AquaEye Viz Backend running on http://127.0.0.1:3000");

    axum::serve(listener, app).await.unwrap();
}

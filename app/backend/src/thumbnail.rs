use image;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

pub struct ThumbnailCache {
    cache_dir: PathBuf,
}

impl ThumbnailCache {
    pub fn new(cache_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all(&cache_dir)?;
        Ok(Self { cache_dir })
    }

    fn compute_cache_key(&self, path: &Path, mtime: u64, size: u32) -> String {
        let mut hasher = Sha256::new();
        hasher.update(path.to_string_lossy().as_bytes());
        hasher.update(mtime.to_le_bytes());
        hasher.update(size.to_le_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn get_thumb_path(&self, path: &Path, mtime: u64, size: u32) -> PathBuf {
        let key = self.compute_cache_key(path, mtime, size);
        self.cache_dir
            .join(size.to_string())
            .join(format!("{}.webp", key))
    }

    pub fn ensure_thumbnail(
        &self,
        path: &Path,
        mtime: u64,
        size: u32,
    ) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let thumb_path = self.get_thumb_path(path, mtime, size);

        if thumb_path.exists() {
            return Ok(thumb_path);
        }

        fs::create_dir_all(thumb_path.parent().unwrap())?;

        let img = image::open(path)?;
        let thumbnail = img.thumbnail(size, size);

        thumbnail.save(&thumb_path)?;
        Ok(thumb_path)
    }

    pub fn ensure_thumbnails_batch(
        &self,
        paths: Vec<(PathBuf, u64)>,
        size: u32,
    ) -> Vec<(String, String)> {
        paths
            .par_iter()
            .filter_map(|(path, mtime)| {
                match self.ensure_thumbnail(path, *mtime, size) {
                    Ok(thumb_path) => Some((
                        path.to_string_lossy().to_string(),
                        thumb_path.to_string_lossy().to_string(),
                    )),
                    Err(e) => {
                        eprintln!("Failed to create thumbnail for {:?}: {}", path, e);
                        None
                    }
                }
            })
            .collect()
    }
}

pub fn get_file_mtime(path: &Path) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

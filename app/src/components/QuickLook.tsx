import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";
import { formatBytes } from "../utils";

export function QuickLook() {
  const {
    filteredImages,
    selectedIds,
    quicklookIndex,
    setViewMode,
    moveQuicklook,
    markAsViewed,
    setActiveId,
  } = useStore();

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Determine which images to cycle through
  const imagesToShow = useMemo(() => {
    if (selectedIds.size > 0) {
      return filteredImages.filter((img) => selectedIds.has(img.id));
    }
    return filteredImages;
  }, [filteredImages, selectedIds]);

  const currentImage = imagesToShow[quicklookIndex];

  // Reset dimensions when image changes
  useEffect(() => {
    setImageDimensions(null);
  }, [quicklookIndex]);

  // Mark as viewed when displayed
  useEffect(() => {
    if (currentImage) {
      markAsViewed(currentImage.id);
    }
  }, [currentImage, markAsViewed]);

  // Preload adjacent images for smooth navigation
  useEffect(() => {
    const preloadIndices = [
      (quicklookIndex + 1) % imagesToShow.length,
      (quicklookIndex - 1 + imagesToShow.length) % imagesToShow.length,
    ];

    preloadIndices.forEach((idx) => {
      const img = imagesToShow[idx];
      if (img) {
        const preloadImg = new Image();
        preloadImg.src = convertFileSrc(img.path);
      }
    });
  }, [quicklookIndex, imagesToShow]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  const handleOpenInViewer = () => {
    if (currentImage) {
      setActiveId(currentImage.id);
      setViewMode("viewer");
    }
  };

  if (!currentImage) {
    return (
      <div className="quicklook-overlay" onClick={() => setViewMode("grid")}>
        <div className="quicklook-empty">
          <p>No images to display</p>
        </div>
      </div>
    );
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setViewMode("grid");
    }
  };

  const metadata = currentImage.metadata;

  return (
    <div className="quicklook-overlay" onClick={handleBackdropClick}>
      <div className="quicklook-container">
        {/* Header */}
        <header className="quicklook-header">
          <div className="quicklook-header-left">
            <h2 className="quicklook-filename">{currentImage.filename}</h2>
            <div className="quicklook-meta-row">
              <span className="quicklook-counter">
                {quicklookIndex + 1} of {imagesToShow.length}
              </span>
              {selectedIds.size > 0 && (
                <span className="quicklook-selected-badge">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          </div>
          <div className="quicklook-header-right">
            <button
              className="quicklook-action-btn"
              onClick={handleOpenInViewer}
              title="Open in viewer (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Open
            </button>
            <button
              className="quicklook-close-btn"
              onClick={() => setViewMode("grid")}
              title="Close (Space/Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Image Area */}
        <div className="quicklook-content">
          {imagesToShow.length > 1 && (
            <button
              className="quicklook-nav quicklook-nav-prev"
              onClick={() => moveQuicklook("prev")}
              aria-label="Previous image"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          <div className="quicklook-image-wrapper">
            <img
              src={convertFileSrc(currentImage.path)}
              alt={currentImage.filename}
              className="quicklook-image"
              draggable={false}
              onLoad={handleImageLoad}
            />
          </div>

          {imagesToShow.length > 1 && (
            <button
              className="quicklook-nav quicklook-nav-next"
              onClick={() => moveQuicklook("next")}
              aria-label="Next image"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 15L13 10L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Footer with metadata */}
        <footer className="quicklook-footer">
          <div className="quicklook-info-chips">
            {imageDimensions && (
              <span className="quicklook-chip">
                {imageDimensions.width} × {imageDimensions.height}
              </span>
            )}
            <span className="quicklook-chip">
              {formatBytes(currentImage.size_bytes)}
            </span>
            {metadata.date && (
              <span className="quicklook-chip">{metadata.date}</span>
            )}
            {metadata.series && (
              <span className="quicklook-chip">{metadata.series}</span>
            )}
            {metadata.frame !== null && (
              <span className="quicklook-chip">Frame #{metadata.frame}</span>
            )}
          </div>
          <div className="quicklook-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Navigate</span>
            <span><kbd>Enter</kbd> Open</span>
            <span><kbd>Space</kbd> Close</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

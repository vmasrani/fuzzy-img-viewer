import { useEffect, useMemo } from "react";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";

export function QuickLook() {
  const {
    filteredImages,
    selectedIds,
    quicklookIndex,
    setViewMode,
    moveQuicklook,
    markAsViewed,
  } = useStore();

  // Determine which images to cycle through
  const imagesToShow = useMemo(() => {
    if (selectedIds.size > 0) {
      return filteredImages.filter((img) => selectedIds.has(img.id));
    }
    return filteredImages;
  }, [filteredImages, selectedIds]);

  const currentImage = imagesToShow[quicklookIndex];

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

  return (
    <div className="quicklook-overlay" onClick={handleBackdropClick}>
      <div className="quicklook-container">
        <div className="quicklook-header">
          <div className="quicklook-title">
            <span className="quicklook-filename">{currentImage.filename}</span>
            <span className="quicklook-counter">
              {quicklookIndex + 1} / {imagesToShow.length}
              {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
            </span>
          </div>
          <button
            className="quicklook-close"
            onClick={() => setViewMode("grid")}
          >
            <span>×</span>
          </button>
        </div>

        <div className="quicklook-content">
          {imagesToShow.length > 1 && (
            <button
              className="quicklook-nav quicklook-nav-prev"
              onClick={() => moveQuicklook("prev")}
            >
              ‹
            </button>
          )}

          <div className="quicklook-image-wrapper">
            <img
              src={convertFileSrc(currentImage.path)}
              alt={currentImage.filename}
              className="quicklook-image"
              draggable={false}
            />
          </div>

          {imagesToShow.length > 1 && (
            <button
              className="quicklook-nav quicklook-nav-next"
              onClick={() => moveQuicklook("next")}
            >
              ›
            </button>
          )}
        </div>

        <div className="quicklook-footer">
          <span className="quicklook-path">{currentImage.path}</span>
          {currentImage.metadata.date && (
            <span className="quicklook-meta">{currentImage.metadata.date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

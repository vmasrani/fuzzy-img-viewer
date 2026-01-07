import { useState, useRef, useEffect } from "react";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";

export function Viewer() {
  const { filteredImages, activeId, setActiveId, setViewMode, markAsViewed } = useStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeIndex = filteredImages.findIndex((img) => img.id === activeId);
  const activeImage = filteredImages[activeIndex];

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });

    // Mark image as viewed when it's displayed in viewer mode
    if (activeId) {
      markAsViewed(activeId);
    }
  }, [activeId, markAsViewed]);

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveId(filteredImages[activeIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (activeIndex < filteredImages.length - 1) {
      setActiveId(filteredImages[activeIndex + 1].id);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(5, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!activeImage) {
    return null;
  }

  const metadataChips = [
    activeImage.metadata.date,
    activeImage.metadata.subject,
    activeImage.metadata.series,
  ].filter(Boolean) as string[];

  return (
    <div className="viewer-overlay">
      <div className="viewer-chrome">
        <div className="viewer-title">
          <span className="viewer-filename">{activeImage.filename}</span>
          <div className="viewer-details">
            <span>
              {activeIndex + 1} / {filteredImages.length}
            </span>
            {metadataChips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </div>
        <div className="viewer-controls">
          <button className="viewer-pill secondary" onClick={() => setZoom(1)}>
            Reset zoom
          </button>
          <button className="viewer-pill" onClick={() => setViewMode("grid")}>
            Back to library
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="viewer-content"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="viewer-image-container">
          <img
            src={convertFileSrc(activeImage.path)}
            alt={activeImage.filename}
            className="viewer-image"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${
                pan.y / zoom
              }px)`,
            }}
            draggable={false}
          />
        </div>
        {activeIndex > 0 && (
          <button className="viewer-nav prev" onClick={handlePrev} aria-label="Previous image">
            ‹
          </button>
        )}
        {activeIndex < filteredImages.length - 1 && (
          <button className="viewer-nav next" onClick={handleNext} aria-label="Next image">
            ›
          </button>
        )}
        <div className="viewer-bottom-bar">
          <span className="viewer-path">{activeImage.path}</span>
          <span className="viewer-counter">
            {activeIndex + 1} / {filteredImages.length}
          </span>
        </div>
      </div>
    </div>
  );
}

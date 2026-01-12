import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";
import { formatBytes, formatDate } from "../utils";

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

export function Viewer() {
  const { filteredImages, activeId, setActiveId, setViewMode, markAsViewed } = useStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const activeIndex = filteredImages.findIndex((img) => img.id === activeId);
  const activeImage = filteredImages[activeIndex];

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Get adjacent images for the filmstrip
  const adjacentImages = useMemo(() => {
    const range = 3;
    const images: typeof filteredImages = [];
    for (let i = activeIndex - range; i <= activeIndex + range; i++) {
      if (i >= 0 && i < filteredImages.length) {
        images.push(filteredImages[i]);
      }
    }
    return images;
  }, [activeIndex, filteredImages]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageDimensions(null);

    if (activeId) {
      markAsViewed(activeId);
    }
  }, [activeId, markAsViewed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "i") {
        setInfoPanelOpen((prev) => !prev);
      } else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(5, z * 1.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(0.25, z / 1.25));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveId(filteredImages[activeIndex - 1].id);
    }
  }, [activeIndex, filteredImages, setActiveId]);

  const handleNext = useCallback(() => {
    if (activeIndex < filteredImages.length - 1) {
      setActiveId(filteredImages[activeIndex + 1].id);
    }
  }, [activeIndex, filteredImages, setActiveId]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.25, Math.min(5, z * delta)));
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

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(5, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, z / 1.25));
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomSelect = (level: number) => {
    setZoom(level);
  };

  if (!activeImage) {
    return null;
  }

  const metadata = activeImage.metadata;

  return (
    <div className="viewer-overlay">
      {/* Top Header */}
      <header className="viewer-header">
        <div className="viewer-header-left">
          <button
            className="viewer-back-btn"
            onClick={() => setViewMode("grid")}
            title="Back to library (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="viewer-title-group">
            <h1 className="viewer-filename">{activeImage.filename}</h1>
            <span className="viewer-counter">
              {activeIndex + 1} of {filteredImages.length}
            </span>
          </div>
        </div>

        <div className="viewer-header-center">
          {/* Zoom Controls */}
          <div className="viewer-zoom-controls">
            <button onClick={handleZoomOut} title="Zoom out (-)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <select
              value={zoom}
              onChange={(e) => handleZoomSelect(Number(e.target.value))}
              className="viewer-zoom-select"
            >
              {ZOOM_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {Math.round(level * 100)}%
                </option>
              ))}
            </select>
            <button onClick={handleZoomIn} title="Zoom in (+)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="viewer-zoom-divider" />
            <button onClick={handleFitToScreen} title="Fit to screen (0)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="viewer-header-right">
          <button
            className={`viewer-info-toggle ${infoPanelOpen ? "active" : ""}`}
            onClick={() => setInfoPanelOpen(!infoPanelOpen)}
            title="Toggle info panel (i)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 8V13M9 5.5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="viewer-main">
        {/* Image Canvas */}
        <div
          ref={containerRef}
          className="viewer-canvas"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Navigation Arrows */}
          {activeIndex > 0 && (
            <button className="viewer-nav prev" onClick={handlePrev} aria-label="Previous image">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {activeIndex < filteredImages.length - 1 && (
            <button className="viewer-nav next" onClick={handleNext} aria-label="Next image">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="viewer-image-wrapper">
            <img
              ref={imageRef}
              src={convertFileSrc(activeImage.path)}
              alt={activeImage.filename}
              className="viewer-image"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              draggable={false}
              onLoad={handleImageLoad}
            />
          </div>
        </div>

        {/* Info Sidebar */}
        {infoPanelOpen && (
          <aside className="viewer-sidebar">
            {/* File Information */}
            <section className="viewer-info-section">
              <h3 className="viewer-info-title">File Information</h3>
              <div className="viewer-info-grid">
                <div className="viewer-info-item">
                  <span className="viewer-info-label">Name</span>
                  <span className="viewer-info-value truncate">{activeImage.filename}</span>
                </div>
                {imageDimensions && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">Dimensions</span>
                    <span className="viewer-info-value">
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  </div>
                )}
                <div className="viewer-info-item">
                  <span className="viewer-info-label">Size</span>
                  <span className="viewer-info-value">{formatBytes(activeImage.size_bytes)}</span>
                </div>
                <div className="viewer-info-item">
                  <span className="viewer-info-label">Modified</span>
                  <span className="viewer-info-value">{formatDate(activeImage.mtime)}</span>
                </div>
              </div>
            </section>

            {/* Metadata */}
            <section className="viewer-info-section">
              <h3 className="viewer-info-title">Metadata</h3>
              <div className="viewer-info-grid">
                {metadata.date && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">Date</span>
                    <span className="viewer-info-value">{metadata.date}</span>
                  </div>
                )}
                {metadata.subject && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">Subject</span>
                    <span className="viewer-info-value">{metadata.subject}</span>
                  </div>
                )}
                {metadata.series && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">Series</span>
                    <span className="viewer-info-value">{metadata.series}</span>
                  </div>
                )}
                {metadata.frame !== null && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">Frame</span>
                    <span className="viewer-info-value">#{metadata.frame}</span>
                  </div>
                )}
                {metadata.a !== null && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">A</span>
                    <span className="viewer-info-value">{metadata.a}</span>
                  </div>
                )}
                {metadata.b !== null && (
                  <div className="viewer-info-item">
                    <span className="viewer-info-label">B</span>
                    <span className="viewer-info-value">{metadata.b}</span>
                  </div>
                )}
                {!metadata.date && !metadata.subject && !metadata.series && metadata.frame === null && metadata.a === null && metadata.b === null && (
                  <div className="viewer-info-empty">No metadata available</div>
                )}
              </div>
            </section>

            {/* Tokens/Tags */}
            {metadata.tokens && metadata.tokens.length > 0 && (
              <section className="viewer-info-section">
                <h3 className="viewer-info-title">Tags</h3>
                <div className="viewer-tags">
                  {metadata.tokens.map((token, i) => (
                    <span key={i} className="viewer-tag">{token}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Keyboard Shortcuts */}
            <section className="viewer-info-section viewer-shortcuts">
              <h3 className="viewer-info-title">Shortcuts</h3>
              <div className="viewer-shortcut-list">
                <div className="viewer-shortcut">
                  <kbd>←</kbd><kbd>→</kbd>
                  <span>Navigate</span>
                </div>
                <div className="viewer-shortcut">
                  <kbd>+</kbd><kbd>-</kbd>
                  <span>Zoom</span>
                </div>
                <div className="viewer-shortcut">
                  <kbd>0</kbd>
                  <span>Fit to screen</span>
                </div>
                <div className="viewer-shortcut">
                  <kbd>i</kbd>
                  <span>Toggle info</span>
                </div>
                <div className="viewer-shortcut">
                  <kbd>Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
            </section>
          </aside>
        )}
      </div>

      {/* Filmstrip */}
      <footer className="viewer-filmstrip">
        <div className="viewer-filmstrip-track">
          {adjacentImages.map((img) => {
            const imgIndex = filteredImages.findIndex((i) => i.id === img.id);
            const isActive = img.id === activeId;
            return (
              <button
                key={img.id}
                className={`viewer-filmstrip-thumb ${isActive ? "active" : ""}`}
                onClick={() => setActiveId(img.id)}
                title={img.filename}
              >
                <img
                  src={convertFileSrc(img.thumb_path || img.path)}
                  alt={img.filename}
                />
                <span className="viewer-filmstrip-index">{imgIndex + 1}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";

export function Compare() {
  const { images, selectedIds, setViewMode, compareMode, setCompareMode } = useStore();
  const [soloIndex, setSoloIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const selectedImages = images.filter((img) => selectedIds.has(img.id));

  // Keyboard navigation for compare view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (compareMode === "solo") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSoloIndex((prev) =>
            (prev - 1 + selectedImages.length) % selectedImages.length
          );
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSoloIndex((prev) => (prev + 1) % selectedImages.length);
        }
      }

      // Tab cycles through compare modes
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const modes: Array<"solo" | "grid" | "sidebyside"> = ["solo", "grid", "sidebyside"];
        const currentIndex = modes.indexOf(compareMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCompareMode(modes[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compareMode, selectedImages.length, setCompareMode]);

  // Reset zoom when switching images in solo mode
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [soloIndex]);

  if (selectedImages.length === 0) {
    return (
      <div className="viewer-overlay">
        <div className="viewer-header">
          <div>Compare Mode</div>
          <button onClick={() => setViewMode("grid")}>Close</button>
        </div>
        <div className="empty-state">
          <p>No images selected</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Select images in grid view using Tab to compare them
          </p>
        </div>
      </div>
    );
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (compareMode === "solo" || compareMode === "sidebyside") {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.5, Math.min(5, z * delta)));
    }
  };

  // Render solo mode - single image, arrow keys to cycle
  const renderSoloMode = () => {
    const currentImage = selectedImages[soloIndex];
    if (!currentImage) return null;

    return (
      <div className="compare-solo" onWheel={handleWheel}>
        {selectedImages.length > 1 && (
          <button
            className="compare-solo-nav prev"
            onClick={() => setSoloIndex((prev) =>
              (prev - 1 + selectedImages.length) % selectedImages.length
            )}
          >
            ‹
          </button>
        )}

        <div className="compare-solo-image-container">
          <img
            src={convertFileSrc(currentImage.path)}
            alt={currentImage.filename}
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>

        {selectedImages.length > 1 && (
          <button
            className="compare-solo-nav next"
            onClick={() => setSoloIndex((prev) => (prev + 1) % selectedImages.length)}
          >
            ›
          </button>
        )}

        <div className="compare-solo-info">
          <span className="compare-solo-filename">{currentImage.filename}</span>
          <span className="compare-solo-counter">
            {soloIndex + 1} / {selectedImages.length}
          </span>
        </div>
      </div>
    );
  };

  // Render grid mode - all images in auto-calculated grid
  const renderGridMode = () => {
    const gridCols = Math.ceil(Math.sqrt(selectedImages.length));

    return (
      <div
        className="compare-grid"
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {selectedImages.map((image) => (
          <div key={image.id} className="compare-item">
            <img src={convertFileSrc(image.path)} alt={image.filename} />
            <div className="compare-label">{image.filename}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render side-by-side mode - 2 images with sync zoom
  const renderSideBySideMode = () => {
    const image1 = selectedImages[0];
    const image2 = selectedImages[1] || selectedImages[0];

    return (
      <div className="compare-sidebyside" onWheel={handleWheel}>
        <div className="compare-sidebyside-panel">
          <div className="compare-sidebyside-image">
            <img
              src={convertFileSrc(image1.path)}
              alt={image1.filename}
              style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
              draggable={false}
            />
          </div>
          <div className="compare-sidebyside-label">{image1.filename}</div>
        </div>
        <div className="compare-sidebyside-divider" />
        <div className="compare-sidebyside-panel">
          <div className="compare-sidebyside-image">
            <img
              src={convertFileSrc(image2.path)}
              alt={image2.filename}
              style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
              draggable={false}
            />
          </div>
          <div className="compare-sidebyside-label">{image2.filename}</div>
        </div>
      </div>
    );
  };

  const modeLabels = {
    solo: "Solo",
    grid: "Grid",
    sidebyside: "Side-by-Side",
  };

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>
            Compare Mode - {selectedImages.length} image
            {selectedImages.length !== 1 ? "s" : ""}
          </span>
          <div className="compare-mode-switcher">
            {(["solo", "grid", "sidebyside"] as const).map((mode) => (
              <button
                key={mode}
                className={`compare-mode-btn ${compareMode === mode ? "active" : ""}`}
                onClick={() => setCompareMode(mode)}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(compareMode === "solo" || compareMode === "sidebyside") && (
            <button onClick={() => setZoom(1)}>Reset Zoom</button>
          )}
          <button onClick={() => setViewMode("grid")}>Close</button>
        </div>
      </div>

      <div className="compare-content">
        {compareMode === "solo" && renderSoloMode()}
        {compareMode === "grid" && renderGridMode()}
        {compareMode === "sidebyside" && renderSideBySideMode()}
      </div>

      <div className="compare-footer">
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Press Tab to switch modes • {compareMode === "solo" ? "← → to navigate" : ""}
        </span>
      </div>
    </div>
  );
}

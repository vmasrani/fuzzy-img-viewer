import { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStore } from "../store";
import { convertFileSrc } from "../commands";

export function Compare() {
  const { filteredImages, selectedIds, setViewMode, compareMode, setCompareMode } = useStore();
  const [soloIndex, setSoloIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Use filteredImages to respect current search/filter, fall back to selectedIds
  const selectedImages = useMemo(() =>
    filteredImages.filter((img) => selectedIds.has(img.id)),
    [filteredImages, selectedIds]
  );

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

  // Calculate grid dimensions - must be before useVirtualizer (hooks must be called unconditionally)
  const gridCols = useMemo(() => {
    const count = selectedImages.length;
    if (count === 0) return 1;
    if (count <= 2) return count;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    return Math.ceil(Math.sqrt(count));
  }, [selectedImages.length]);

  // Calculate rows for virtualization
  const rows = useMemo(() => {
    const result: typeof selectedImages[] = [];
    for (let i = 0; i < selectedImages.length; i += gridCols) {
      result.push(selectedImages.slice(i, i + gridCols));
    }
    return result;
  }, [selectedImages, gridCols]);

  // Virtual row height estimation - must be called unconditionally
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => gridContainerRef.current,
    estimateSize: () => 300,
    overscan: 2,
  });

  // Early return AFTER all hooks
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
            Select images in grid view using Shift+Arrow keys, then press Space or Enter
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

  // Render grid mode - virtualized for performance
  const renderGridMode = () => {
    return (
      <div
        ref={gridContainerRef}
        className="compare-grid-container"
        style={{ height: "100%", overflow: "auto" }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowImages = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="compare-grid-row"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: "16px",
                  padding: "8px 24px",
                }}
              >
                {rowImages.map((image) => (
                  <div key={image.id} className="compare-item">
                    <img
                      src={convertFileSrc(image.thumb_path || image.path)}
                      alt={image.filename}
                      loading="lazy"
                    />
                    <div className="compare-label">{image.filename}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
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
          Tab to switch modes • Space/Esc to close{compareMode === "solo" ? " • ← → to navigate" : ""}
        </span>
      </div>
    </div>
  );
}

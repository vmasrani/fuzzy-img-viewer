import { useStore } from "../store";
import { convertFileSrc } from "../commands";

export function Compare() {
  const { images, selectedIds, setViewMode } = useStore();

  const selectedImages = images.filter((img) => selectedIds.has(img.id));

  if (selectedImages.length === 0) {
    return (
      <div className="viewer-overlay">
        <div className="viewer-header">
          <div>Compare Mode</div>
          <button onClick={() => setViewMode("grid")}>Close</button>
        </div>
        <div className="empty-state">
          <p>No images selected</p>
          <p style={{ fontSize: "14px" }}>
            Select images in grid view using Space to compare them
          </p>
        </div>
      </div>
    );
  }

  const gridCols = Math.ceil(Math.sqrt(selectedImages.length));

  return (
    <div className="viewer-overlay">
      <div className="viewer-header">
        <div>
          Compare Mode - {selectedImages.length} image
          {selectedImages.length !== 1 ? "s" : ""}
        </div>
        <button onClick={() => setViewMode("grid")}>Close</button>
      </div>
      <div
        className="compare-grid"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        }}
      >
        {selectedImages.map((image) => (
          <div key={image.id} className="compare-item">
            <img src={convertFileSrc(image.path)} alt={image.filename} />
            <div className="compare-label">{image.path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

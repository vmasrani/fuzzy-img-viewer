import { SubfolderInfo, convertFileSrc } from "../commands";

interface FolderCardProps {
  folder: SubfolderInfo;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export function FolderCard({ folder, isActive, onClick, onDoubleClick }: FolderCardProps) {
  const previewCount = folder.preview_images.length;

  return (
    <div
      className={`folder-card ${isActive ? "active" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onDoubleClick();
        }
      }}
    >
      <div className="folder-card-preview">
        {previewCount === 0 ? (
          <div className="folder-card-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        ) : previewCount === 1 ? (
          <img
            src={convertFileSrc(folder.preview_images[0])}
            alt=""
            className="folder-card-single"
            loading="lazy"
          />
        ) : (
          <div className={`folder-card-grid grid-${Math.min(previewCount, 4)}`}>
            {folder.preview_images.slice(0, 4).map((imgPath, idx) => (
              <img
                key={idx}
                src={convertFileSrc(imgPath)}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
      <div className="folder-card-info">
        <span className="folder-card-name" title={folder.name}>
          {folder.name}
        </span>
        <span className="folder-card-count">
          {folder.image_count} {folder.image_count === 1 ? "image" : "images"}
        </span>
      </div>
    </div>
  );
}

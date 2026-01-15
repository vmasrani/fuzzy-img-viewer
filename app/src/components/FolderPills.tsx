import { useRef, useMemo } from "react";
import { DiscoveredFolder } from "../commands";

interface FolderPillsProps {
  folders: DiscoveredFolder[];
  selectedPaths: Set<string>;
  onToggle: (path: string) => void;
  showOnlyWithImages?: boolean;
}

export function FolderPills({
  folders,
  selectedPaths,
  onToggle,
  showOnlyWithImages = true,
}: FolderPillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter to folders with images if requested, sort by path
  const displayFolders = useMemo(() => {
    const filtered = showOnlyWithImages
      ? folders.filter((f) => f.image_count > 0)
      : folders;

    // Sort by path for hierarchical order
    return [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  }, [folders, showOnlyWithImages]);

  // Calculate stats
  const stats = useMemo(() => {
    const selectedCount = displayFolders.filter((f) =>
      selectedPaths.has(f.path)
    ).length;
    const selectedImageCount = displayFolders
      .filter((f) => selectedPaths.has(f.path))
      .reduce((sum, f) => sum + f.image_count, 0);
    const totalImageCount = displayFolders.reduce(
      (sum, f) => sum + f.image_count,
      0
    );

    return { selectedCount, selectedImageCount, totalImageCount };
  }, [displayFolders, selectedPaths]);

  if (displayFolders.length === 0) return null;

  // If only one folder, don't show the pills
  if (displayFolders.length === 1) return null;

  return (
    <div className="folder-pills" ref={containerRef}>
      <div className="folder-pills-header">
        <span className="folder-pills-count">
          {selectedPaths.size === 0
            ? `${displayFolders.length} folders (${stats.totalImageCount} images)`
            : `${stats.selectedCount} of ${displayFolders.length} selected (${stats.selectedImageCount} images)`}
        </span>
      </div>
      <div className="folder-pills-inner">
        {displayFolders.map((folder) => {
          const isSelected = selectedPaths.has(folder.path);

          return (
            <button
              key={folder.path}
              className={`folder-pill ${isSelected ? "selected" : ""}`}
              onClick={() => onToggle(folder.path)}
              title={`${folder.path} (${folder.image_count} images)`}
            >
              {folder.name}
              {folder.image_count > 0 && (
                <span className="folder-pill-count">{folder.image_count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

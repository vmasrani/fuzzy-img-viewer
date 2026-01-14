import { useRef, useEffect, useMemo } from "react";
import { SiblingFolderInfo } from "../commands";
import { normalizePath } from "../utils";

interface SiblingTabsProps {
  siblings: SiblingFolderInfo[];
  currentPath: string;
  currentImageCount: number;
  onSelect: (path: string) => void;
  showOnlyWithImages?: boolean;
}

function getFolderName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

interface FolderTab {
  path: string;
  name: string;
  imageCount: number;
  isCurrent: boolean;
}

export function SiblingTabs({
  siblings,
  currentPath,
  currentImageCount,
  onSelect,
  showOnlyWithImages = true,
}: SiblingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Build list of folders: siblings + current, deduplicated, optionally filtered
  const allFolders = useMemo(() => {
    const normalizedCurrent = normalizePath(currentPath);
    const seen = new Set<string>();
    const result: FolderTab[] = [];

    // Add siblings first (normalized and deduplicated)
    for (const sibling of siblings) {
      const normalized = normalizePath(sibling.path);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        result.push({
          path: normalized,
          name: sibling.name,
          imageCount: sibling.image_count,
          isCurrent: false,
        });
      }
    }

    // Add current path if not already included
    if (normalizedCurrent && !seen.has(normalizedCurrent)) {
      result.push({
        path: normalizedCurrent,
        name: getFolderName(normalizedCurrent),
        imageCount: currentImageCount,
        isCurrent: true,
      });
    } else {
      // Mark the existing entry as current
      const existing = result.find((f) => f.path === normalizedCurrent);
      if (existing) {
        existing.isCurrent = true;
        existing.imageCount = currentImageCount; // Use current folder's actual count
      }
    }

    // Filter to only folders with images if requested (but always include current)
    const filtered = showOnlyWithImages
      ? result.filter((f) => f.isCurrent || f.imageCount > 0)
      : result;

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [siblings, currentPath, currentImageCount, showOnlyWithImages]);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentPath]);

  // Hide if only one folder (or no folders)
  if (allFolders.length <= 1) return null;

  return (
    <div className="sibling-tabs" ref={containerRef}>
      <div className="sibling-tabs-inner">
        {allFolders.map((folder) => (
          <button
            key={folder.path}
            ref={folder.isCurrent ? activeRef : null}
            className={`sibling-tab ${folder.isCurrent ? "active" : ""}`}
            onClick={() => !folder.isCurrent && onSelect(folder.path)}
            title={`${folder.path} (${folder.imageCount} images)`}
          >
            {folder.name}
            {folder.imageCount > 0 && (
              <span className="sibling-tab-count">{folder.imageCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

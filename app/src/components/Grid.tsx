import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useMemo } from "react";
import { useStore } from "../store";
import { ensureThumbnails, convertFileSrc } from "../commands";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return "";
  if (paths.length === 1) {
    const parts = paths[0].split("/");
    parts.pop(); // Remove filename
    return parts.join("/") + "/";
  }

  const sorted = [...paths].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  let i = 0;
  while (i < first.length && first[i] === last[i]) i++;

  // Backtrack to last /
  const prefix = first.substring(0, i);
  const lastSlash = prefix.lastIndexOf("/");
  return lastSlash >= 0 ? prefix.substring(0, lastSlash + 1) : "";
}

function getRelativePath(fullPath: string, commonPrefix: string): string {
  if (commonPrefix && fullPath.startsWith(commonPrefix)) {
    return fullPath.substring(commonPrefix.length);
  }
  return fullPath;
}

export function Grid() {
  const {
    filteredImages,
    thumbSize,
    activeId,
    selectedIds,
    setActiveId,
    thumbnailMap,
    setThumbnailPath,
    searchSelectedIds,
  } = useStore();

  // If there are search selections, only show those images
  const displayImages =
    searchSelectedIds.size > 0
      ? filteredImages.filter((img) => searchSelectedIds.has(img.id))
      : filteredImages;

  // Compute common path prefix
  const commonPrefix = useMemo(() => {
    return findCommonPrefix(displayImages.map((img) => img.path));
  }, [displayImages]);

  const parentRef = useRef<HTMLDivElement>(null);

  const containerWidth = parentRef.current?.clientWidth || window.innerWidth;
  const itemsPerRow = Math.floor((containerWidth - 12) / (thumbSize + 12)); // account for padding and gap

  const rowCount = Math.ceil(displayImages.length / itemsPerRow);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => thumbSize + 56 + 12, // image + header + gap
    overscan: 2,
  });

  useEffect(() => {
    const visible = rowVirtualizer.getVirtualItems();
    const visibleImages = visible.flatMap((row) => {
      const start = row.index * itemsPerRow;
      const end = Math.min(start + itemsPerRow, displayImages.length);
      return displayImages.slice(start, end);
    });

    const toLoad = visibleImages.filter(
      (img) => !thumbnailMap.has(img.path)
    );

    if (toLoad.length > 0) {
      const pathsAndMtimes: [string, number][] = toLoad.map((img) => [
        img.path,
        img.mtime,
      ]);

      ensureThumbnails(pathsAndMtimes, thumbSize).then((results) => {
        results.forEach(([originalPath, thumbPath]) => {
          setThumbnailPath(originalPath, thumbPath);
        });
      });
    }
  }, [rowVirtualizer.getVirtualItems(), thumbSize, displayImages]);

  if (displayImages.length === 0) {
    return (
      <div className="loading">
        {searchSelectedIds.size > 0
          ? "No selected images match your current filter"
          : "No images match your search"}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="grid-container">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * itemsPerRow;
          const end = Math.min(start + itemsPerRow, displayImages.length);
          const rowImages = displayImages.slice(start, end);

          return (
            <div
              key={virtualRow.key}
              className="grid-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                height: `${thumbSize + 56}px`,
              }}
            >
              {rowImages.map((image) => {
                const thumbPath = thumbnailMap.get(image.path);
                const isActive = image.id === activeId;
                const isSelected = selectedIds.has(image.id);
                const relativePath = getRelativePath(image.path, commonPrefix);

                return (
                  <div
                    key={image.id}
                    className={`tile ${isActive ? "active" : ""} ${
                      isSelected ? "selected" : ""
                    }`}
                    style={{
                      width: `${thumbSize}px`,
                      height: `${thumbSize + 56}px`,
                    }}
                    onClick={() => setActiveId(image.id)}
                    onDoubleClick={() => {
                      useStore.setState({ viewMode: "viewer" });
                    }}
                  >
                    <div className="tile-header">
                      <div className="tile-filename" title={image.path}>
                        {relativePath}
                      </div>
                      <div className="tile-meta">
                        {formatBytes(image.size_bytes)}
                      </div>
                    </div>
                    <div className="tile-image-container">
                      {thumbPath ? (
                        <img
                          src={convertFileSrc(thumbPath)}
                          alt={image.filename}
                        />
                      ) : (
                        <div className="tile-loading">
                          <div className="tile-loading-spinner"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useMemo } from "react";
import { useStore } from "../store";
import { ensureThumbnails, convertFileSrc } from "../commands";
import { buildImageGroups, sortGroupsByOrder } from "../grouping";
import { ImageRecord } from "../types";
import { formatBytes, findCommonPrefix, getRelativePath } from "../utils";

const GROUP_HEADER_HEIGHT = 72;
const ROW_GAP = 12;

type RowType = "header" | "images";

interface VirtualRow {
  type: RowType;
  groupKey: string;
  height: number;
  images?: ImageRecord[];
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
    containerWidth,
    setContainerWidth,
    groupOrder,
    setGroupOrder,
    collapsedGroups,
    toggleGroupCollapse,
    setGroupCollapse,
  } = useStore();

  const parentRef = useRef<HTMLDivElement>(null);

  // Keep containerWidth in sync via ResizeObserver
  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth;
      setContainerWidth(width);
    });

    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, [setContainerWidth]);

  const itemsPerRow = Math.max(1, Math.floor(containerWidth / (thumbSize + 12)));
  const imageRowHeight = thumbSize + 56;

  const baseGroups = useMemo(() => buildImageGroups(filteredImages), [filteredImages]);
  const orderedGroups = useMemo(
    () => sortGroupsByOrder(baseGroups, groupOrder),
    [baseGroups, groupOrder]
  );

  const visibleGroups = useMemo(() => {
    if (searchSelectedIds.size === 0) {
      return orderedGroups;
    }

    return orderedGroups
      .map((group) => ({
        ...group,
        images: group.images.filter((img) => searchSelectedIds.has(img.id)),
      }))
      .filter((group) => group.images.length > 0);
  }, [orderedGroups, searchSelectedIds]);

  const effectiveOrder = useMemo(() => {
    if (groupOrder.length > 0) {
      return groupOrder;
    }
    return orderedGroups.map((group) => group.key);
  }, [groupOrder, orderedGroups]);

  const orderIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    effectiveOrder.forEach((id, index) => map.set(id, index));
    return map;
  }, [effectiveOrder]);

  const visibleImageCount = useMemo(
    () => visibleGroups.reduce((total, group) => total + group.images.length, 0),
    [visibleGroups]
  );

  const displayImages = useMemo(() => {
    const flattened = visibleGroups.flatMap((group) =>
      collapsedGroups.has(group.key) ? [] : group.images
    );
    return flattened;
  }, [visibleGroups, collapsedGroups]);

  const commonPrefix = useMemo(() => {
    return findCommonPrefix(displayImages.map((img) => img.path));
  }, [displayImages]);

  const rows = useMemo(() => {
    const entries: VirtualRow[] = [];
    visibleGroups.forEach((group) => {
      entries.push({
        type: "header",
        groupKey: group.key,
        height: GROUP_HEADER_HEIGHT,
      });

      if (!collapsedGroups.has(group.key)) {
        for (let i = 0; i < group.images.length; i += itemsPerRow) {
          const chunk = group.images.slice(i, i + itemsPerRow);
          entries.push({
            type: "images",
            groupKey: group.key,
            height: imageRowHeight + ROW_GAP,
            images: chunk,
          });
        }
      }
    });
    return entries;
  }, [visibleGroups, collapsedGroups, itemsPerRow, imageRowHeight]);

  const imageToGroupKey = useMemo(() => {
    const map = new Map<string, string>();
    orderedGroups.forEach((group) => {
      group.images.forEach((img) => map.set(img.id, group.key));
    });
    return map;
  }, [orderedGroups]);

  // Expand collapsed group if user navigates to an image inside it
  // Only run when activeId changes (not when collapsedGroups changes, which would fight user's collapse action)
  const prevActiveIdRef = useRef(activeId);
  useEffect(() => {
    // Skip if activeId hasn't actually changed (e.g., collapsedGroups changed)
    if (activeId === prevActiveIdRef.current) return;
    prevActiveIdRef.current = activeId;

    if (!activeId) return;
    const groupKey = imageToGroupKey.get(activeId);
    if (groupKey && collapsedGroups.has(groupKey)) {
      setGroupCollapse(groupKey, false);
    }
  }, [activeId, collapsedGroups, imageToGroupKey, setGroupCollapse]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.height ?? imageRowHeight + ROW_GAP,
    overscan: 4,
  });

  // Scroll to active item when it changes
  useEffect(() => {
    if (!activeId) return;

    const rowIndex = rows.findIndex(
      (row) => row.type === "images" && row.images?.some((img) => img.id === activeId)
    );

    if (rowIndex >= 0) {
      rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, rows]);

  useEffect(() => {
    const visible = rowVirtualizer.getVirtualItems();
    const visibleImages = visible.flatMap((row) => {
      const rowData = rows[row.index];
      if (!rowData || rowData.type !== "images" || !rowData.images) {
        return [];
      }
      return rowData.images;
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
  }, [
    rowVirtualizer.range?.startIndex,
    rowVirtualizer.range?.endIndex,
    thumbSize,
    displayImages,
    itemsPerRow,
    thumbnailMap,
    setThumbnailPath,
  ]);

  const moveGroup = (groupId: string, direction: "up" | "down") => {
    const sourceOrder =
      groupOrder.length > 0 ? groupOrder : orderedGroups.map((group) => group.key);
    const currentIndex = sourceOrder.indexOf(groupId);
    if (currentIndex === -1) return;

    const delta = direction === "up" ? -1 : 1;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= sourceOrder.length) return;

    const nextOrder = [...sourceOrder];
    const [removed] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, removed);
    setGroupOrder(nextOrder);
  };

  if (visibleImageCount === 0) {
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
          const rowData = rows[virtualRow.index];
          if (!rowData) return null;

          if (rowData.type === "header") {
            const group = visibleGroups.find((g) => g.key === rowData.groupKey);
            if (!group) return null;
            const collapsed = collapsedGroups.has(group.key);
            const orderIndex = orderIndexMap.get(group.key) ?? 0;
            const isFirst = orderIndex === 0;

            return (
            <div
              key={virtualRow.key}
              className="group-header-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                height: `${GROUP_HEADER_HEIGHT}px`,
              }}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest(".group-header-actions")) return;
                toggleGroupCollapse(group.key);
              }}
            >
              <button
                className="group-collapse-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleGroupCollapse(group.key);
                }}
                aria-label={collapsed ? "Expand group" : "Collapse group"}
              >
                {collapsed ? "▶" : "▼"}
              </button>
                <div className="group-header-content">
                  <div className="group-header-title">
                    <div className="group-label">{group.label}</div>
                    <div className="group-subtitle">
                      {group.description || "Shared prefix"}
                    </div>
                  </div>
                  <div className="group-count">
                    {group.images.length}{" "}
                    {group.images.length === 1 ? "file" : "files"}
                  </div>
                </div>
                <div className="group-header-actions">
                  <span className={`group-type-badge ${group.type}`}>
                    {group.type === "natural" ? "Prefix" : "Folder"}
                  </span>
                  <div className="group-reorder">
                    <button
                      type="button"
                      onClick={() => moveGroup(group.key, "up")}
                      disabled={isFirst}
                      aria-label="Move group up"
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </div>
            );
          }

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
                height: `${imageRowHeight}px`,
                marginBottom: `${ROW_GAP}px`,
              }}
            >
              {rowData.images?.map((image) => {
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

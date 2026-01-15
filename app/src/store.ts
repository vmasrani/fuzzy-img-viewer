import { create } from "zustand";
import { ImageRecord, ViewMode, CompareMode } from "./types";
import { searchImages } from "./search";
import {
  buildImageGroups,
  ensureGroupOrder,
  flattenGroupsByOrder,
  sortImagesAlphabetically,
} from "./grouping";
import { toggleSetItem } from "./utils";
import { DiscoveredFolder } from "./commands";

interface RecentlyViewedItem {
  id: string;
  timestamp: number;
}

export interface PathSegment {
  name: string;
  fullPath: string;
}

interface AppStore {
  folderPath: string | null;
  rootFolderPath: string | null; // The initial folder - don't navigate above this
  images: ImageRecord[];
  query: string;
  filteredImages: ImageRecord[];
  selectedIds: Set<string>;
  searchSelectedIds: Set<string>;
  activeId: string | null;
  selectionAnchorId: string | null;
  thumbSize: number;
  viewMode: ViewMode;
  compareMode: CompareMode;
  quicklookIndex: number;
  commandPaletteOpen: boolean;
  keyboardHelpOpen: boolean;
  infoPanelOpen: boolean;
  thumbnailMap: Map<string, string>;
  recentlyViewed: RecentlyViewedItem[];
  containerWidth: number;
  groupOrder: string[];
  collapsedGroups: Set<string>;
  darkMode: boolean;

  // Pinned images for cross-folder comparison
  pinnedImages: ImageRecord[];

  // Navigation state
  pathSegments: PathSegment[];

  // All discovered folders (cached at startup)
  allFolders: DiscoveredFolder[];
  // Set of folder paths currently selected for viewing
  selectedFolderPaths: Set<string>;

  setFolderPath: (path: string | null) => void;
  setRootFolderPath: (path: string | null) => void;
  setImages: (images: ImageRecord[]) => void;
  setQuery: (query: string) => void;
  toggleSelection: (id: string) => void;
  setActiveId: (id: string | null) => void;
  setThumbSize: (size: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setCompareMode: (mode: CompareMode) => void;
  setQuicklookIndex: (index: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setKeyboardHelpOpen: (open: boolean) => void;
  setInfoPanelOpen: (open: boolean) => void;
  setThumbnailPath: (originalPath: string, thumbPath: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  invertSelection: () => void;
  setSearchSelectedIds: (ids: Set<string>) => void;
  toggleSearchSelection: (id: string) => void;
  clearSearchSelection: () => void;
  moveActive: (direction: "up" | "down" | "left" | "right", extendSelection?: boolean) => void;
  moveQuicklook: (direction: "prev" | "next") => void;
  markAsViewed: (id: string) => void;
  setContainerWidth: (width: number) => void;
  setGroupOrder: (order: string[]) => void;
  toggleGroupCollapse: (id: string) => void;
  setGroupCollapse: (id: string, collapsed: boolean) => void;
  toggleDarkMode: () => void;
  selectRange: (fromId: string, toId: string) => void;

  // Pinned images actions
  pinSelectedImages: () => void;
  unpinImages: (ids: string[]) => void;
  clearPinnedImages: () => void;
  togglePinActive: () => void;

  // Navigation actions
  setPathSegments: (segments: PathSegment[]) => void;
  navigateUp: () => string | null;

  // Folder discovery and selection
  setAllFolders: (folders: DiscoveredFolder[]) => void;
  toggleFolderSelection: (path: string) => void;
  selectAllFolders: () => void;
  clearFolderSelection: () => void;
}

// Load recently viewed from localStorage
const loadRecentlyViewed = (): RecentlyViewedItem[] => {
  try {
    const stored = localStorage.getItem("recentlyViewed");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load recently viewed:", e);
  }
  return [];
};

// Save recently viewed to localStorage
const saveRecentlyViewed = (items: RecentlyViewedItem[]) => {
  try {
    localStorage.setItem("recentlyViewed", JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save recently viewed:", e);
  }
};

// Load dark mode preference from localStorage
const loadDarkMode = (): boolean => {
  try {
    const stored = localStorage.getItem("darkMode");
    return stored === "true";
  } catch {
    return false;
  }
};

// Parse folder path into segments
const parsePathSegments = (folderPath: string): PathSegment[] => {
  if (!folderPath) return [];

  const parts = folderPath.split("/").filter(Boolean);
  const segments: PathSegment[] = [];

  let currentPath = "";
  for (const part of parts) {
    currentPath += "/" + part;
    segments.push({
      name: part,
      fullPath: currentPath,
    });
  }

  return segments;
};

// Apply dark mode class to document
const applyDarkMode = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try {
    localStorage.setItem("darkMode", String(isDark));
  } catch {
    // ignore
  }
};

export const useStore = create<AppStore>((set, get) => ({
  folderPath: null,
  rootFolderPath: null,
  images: [],
  query: "",
  filteredImages: [],
  selectedIds: new Set(),
  searchSelectedIds: new Set(),
  activeId: null,
  selectionAnchorId: null,
  thumbSize: 200,
  viewMode: "grid",
  compareMode: "grid",
  quicklookIndex: 0,
  commandPaletteOpen: false,
  keyboardHelpOpen: false,
  infoPanelOpen: false,
  thumbnailMap: new Map(),
  recentlyViewed: loadRecentlyViewed(),
  containerWidth: window.innerWidth - 24,
  groupOrder: [],
  collapsedGroups: new Set(),
  darkMode: loadDarkMode(),

  // Pinned images initial state
  pinnedImages: [],

  // Navigation initial state
  pathSegments: [],

  // All discovered folders (cached at startup)
  allFolders: [],
  // Set of folder paths currently selected for viewing
  selectedFolderPaths: new Set(),

  setFolderPath: (path) => {
    const segments = path ? parsePathSegments(path) : [];
    set({ folderPath: path, pathSegments: segments });
  },

  setRootFolderPath: (path) => set({ rootFolderPath: path }),

  setImages: (images) => {
    const { query, groupOrder, collapsedGroups, selectedFolderPaths } = get();

    const alphabetized = sortImagesAlphabetically(images);
    const groups = buildImageGroups(alphabetized);
    const resolvedOrder = ensureGroupOrder(groupOrder, groups);
    const orderedImages = flattenGroupsByOrder(groups, resolvedOrder);

    // Filter by selected folders if any are selected
    let filtered = orderedImages;
    if (selectedFolderPaths.size > 0) {
      filtered = orderedImages.filter(img => selectedFolderPaths.has(img.parent_path));
    }

    // Apply search filtering if there's a query
    const filteredImages = query ? searchImages(filtered, query) : filtered;

    const validCollapsed = new Set(
      Array.from(collapsedGroups).filter((id) => resolvedOrder.includes(id))
    );

    set({
      images: orderedImages,
      filteredImages,
      groupOrder: resolvedOrder,
      collapsedGroups: validCollapsed,
      activeId: filteredImages[0]?.id || null,
    });
  },

  setQuery: (query) => {
    const { images, selectedFolderPaths } = get();

    // Filter by selected folders if any are selected
    let filtered = images;
    if (selectedFolderPaths.size > 0) {
      filtered = images.filter(img => selectedFolderPaths.has(img.parent_path));
    }

    // Apply search filtering if there's a query
    const filteredImages = query ? searchImages(filtered, query) : filtered;
    set({
      query,
      filteredImages,
      activeId: filteredImages[0]?.id || null,
    });
  },

  toggleSelection: (id) =>
    set((state) => ({ selectedIds: toggleSetItem(state.selectedIds, id) })),

  setActiveId: (id) => set({ activeId: id }),

  setThumbSize: (size) => set({ thumbSize: Math.max(100, Math.min(500, size)) }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setCompareMode: (mode) => set({ compareMode: mode }),

  setQuicklookIndex: (index) => set({ quicklookIndex: index }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setKeyboardHelpOpen: (open) => set({ keyboardHelpOpen: open }),

  setInfoPanelOpen: (open) => set({ infoPanelOpen: open }),

  setThumbnailPath: (originalPath, thumbPath) =>
    set((state) => {
      const newMap = new Map(state.thumbnailMap);
      newMap.set(originalPath, thumbPath);
      return { thumbnailMap: newMap };
    }),

  clearSelection: () => set({ selectedIds: new Set(), selectionAnchorId: null }),

  selectAll: () => {
    const { filteredImages } = get();
    const allIds = new Set(filteredImages.map((img) => img.id));
    set({ selectedIds: allIds });
  },

  invertSelection: () => {
    const { filteredImages, selectedIds } = get();
    const invertedIds = new Set<string>();
    filteredImages.forEach((img) => {
      if (!selectedIds.has(img.id)) {
        invertedIds.add(img.id);
      }
    });
    set({ selectedIds: invertedIds });
  },

  setSearchSelectedIds: (ids) => set({ searchSelectedIds: ids }),

  toggleSearchSelection: (id) =>
    set((state) => ({ searchSelectedIds: toggleSetItem(state.searchSelectedIds, id) })),

  clearSearchSelection: () => set({ searchSelectedIds: new Set() }),

  setContainerWidth: (width) => set({ containerWidth: width }),
  setGroupOrder: (order) => {
    const { images, query } = get();
    if (images.length === 0) {
      set({ groupOrder: order });
      return;
    }

    const groups = buildImageGroups(images);
    const resolvedOrder = ensureGroupOrder(order, groups);
    const orderedImages = flattenGroupsByOrder(groups, resolvedOrder);

    const filteredImages = query ? searchImages(orderedImages, query) : orderedImages;
    const currentActiveId = get().activeId;
    const activeExists = filteredImages.some((img) => img.id === currentActiveId);
    const nextActiveId = activeExists
      ? currentActiveId
      : filteredImages[0]?.id || null;

    set({
      groupOrder: resolvedOrder,
      images: orderedImages,
      filteredImages,
      activeId: nextActiveId,
    });
  },

  toggleGroupCollapse: (id) =>
    set((state) => ({ collapsedGroups: toggleSetItem(state.collapsedGroups, id) })),

  setGroupCollapse: (id, collapsed) =>
    set((state) => {
      const next = new Set(state.collapsedGroups);
      if (collapsed) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { collapsedGroups: next };
    }),

  moveActive: (direction, extendSelection = false) => {
    const { filteredImages, activeId, thumbSize, containerWidth, selectionAnchorId } = get();
    if (filteredImages.length === 0) return;

    const currentIndex = filteredImages.findIndex((img) => img.id === activeId);
    if (currentIndex === -1) {
      set({ activeId: filteredImages[0].id, selectionAnchorId: filteredImages[0].id });
      return;
    }

    const itemsPerRow = Math.floor(containerWidth / (thumbSize + 12));

    let newIndex = currentIndex;

    switch (direction) {
      case "down":
        newIndex = Math.min(currentIndex + itemsPerRow, filteredImages.length - 1);
        break;
      case "up":
        newIndex = Math.max(currentIndex - itemsPerRow, 0);
        break;
      case "right":
        newIndex = Math.min(currentIndex + 1, filteredImages.length - 1);
        break;
      case "left":
        newIndex = Math.max(currentIndex - 1, 0);
        break;
    }

    const newActiveId = filteredImages[newIndex].id;

    if (extendSelection) {
      // Use existing anchor or current position as anchor
      const anchorId = selectionAnchorId || activeId;
      const anchorIndex = filteredImages.findIndex((img) => img.id === anchorId);

      // Select all items between anchor and new position
      const startIdx = Math.min(anchorIndex, newIndex);
      const endIdx = Math.max(anchorIndex, newIndex);
      const newSelectedIds = new Set<string>();
      for (let i = startIdx; i <= endIdx; i++) {
        newSelectedIds.add(filteredImages[i].id);
      }

      set({
        activeId: newActiveId,
        selectedIds: newSelectedIds,
        selectionAnchorId: anchorId
      });
    } else {
      // Normal move without selection - clear selection and reset anchor
      set({
        activeId: newActiveId,
        selectedIds: new Set(),
        selectionAnchorId: null
      });
    }
  },

  moveQuicklook: (direction) => {
    const { filteredImages, selectedIds, quicklookIndex } = get();

    // Determine which images to cycle through
    // If items are selected, cycle through selected; otherwise cycle all
    const imagesToCycle = selectedIds.size > 0
      ? filteredImages.filter((img) => selectedIds.has(img.id))
      : filteredImages;

    if (imagesToCycle.length === 0) return;

    let newIndex = quicklookIndex;

    if (direction === "next") {
      newIndex = (quicklookIndex + 1) % imagesToCycle.length;
    } else {
      newIndex = (quicklookIndex - 1 + imagesToCycle.length) % imagesToCycle.length;
    }

    set({ quicklookIndex: newIndex });
  },

  markAsViewed: (id) => {
    const { recentlyViewed } = get();

    // Remove existing entry if present
    const filtered = recentlyViewed.filter((item) => item.id !== id);

    // Add to front with current timestamp
    const updated = [{ id, timestamp: Date.now() }, ...filtered];

    // Keep only last 50 items to prevent unbounded growth
    const trimmed = updated.slice(0, 50);

    // Save to localStorage
    saveRecentlyViewed(trimmed);

    // Only update recentlyViewed - don't re-sort images during navigation
    // Images will be sorted on next folder load
    set({ recentlyViewed: trimmed });
  },

  toggleDarkMode: () => {
    const newDarkMode = !get().darkMode;
    applyDarkMode(newDarkMode);
    set({ darkMode: newDarkMode });
  },

  selectRange: (fromId, toId) => {
    const { filteredImages } = get();
    const fromIndex = filteredImages.findIndex((img) => img.id === fromId);
    const toIndex = filteredImages.findIndex((img) => img.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const startIdx = Math.min(fromIndex, toIndex);
    const endIdx = Math.max(fromIndex, toIndex);
    const newSelectedIds = new Set<string>();
    for (let i = startIdx; i <= endIdx; i++) {
      newSelectedIds.add(filteredImages[i].id);
    }

    set({
      selectedIds: newSelectedIds,
      selectionAnchorId: fromId,
      activeId: toId
    });
  },

  // Pin selected images for cross-folder comparison
  pinSelectedImages: () => {
    const { filteredImages, selectedIds, pinnedImages, activeId } = get();
    const existingPaths = new Set(pinnedImages.map((img) => img.path));

    // Get images to pin (selected or active)
    const idsToPin = selectedIds.size > 0
      ? Array.from(selectedIds)
      : activeId ? [activeId] : [];

    const newPinned = filteredImages
      .filter((img) => idsToPin.includes(img.id) && !existingPaths.has(img.path))
      .map((img) => ({ ...img })); // Clone to avoid mutations

    set({ pinnedImages: [...pinnedImages, ...newPinned] });
  },

  unpinImages: (ids) => {
    const { pinnedImages } = get();
    const idsSet = new Set(ids);
    set({ pinnedImages: pinnedImages.filter((img) => !idsSet.has(img.id)) });
  },

  clearPinnedImages: () => {
    set({ pinnedImages: [] });
  },

  togglePinActive: () => {
    const { filteredImages, activeId, pinnedImages } = get();
    if (!activeId) return;

    const activeImage = filteredImages.find((img) => img.id === activeId);
    if (!activeImage) return;

    const isPinned = pinnedImages.some((img) => img.path === activeImage.path);

    if (isPinned) {
      // Unpin by path (not id, since id includes mtime)
      set({ pinnedImages: pinnedImages.filter((img) => img.path !== activeImage.path) });
    } else {
      // Pin the active image
      set({ pinnedImages: [...pinnedImages, { ...activeImage }] });
    }
  },

  // Navigation actions
  setPathSegments: (segments) => set({ pathSegments: segments }),

  navigateUp: () => {
    const { pathSegments } = get();
    if (pathSegments.length <= 1) return null;

    const parentSegment = pathSegments[pathSegments.length - 2];
    return parentSegment.fullPath;
  },

  // Folder discovery and selection
  setAllFolders: (folders) => set({ allFolders: folders }),

  toggleFolderSelection: (path) => {
    const { selectedFolderPaths, images, query } = get();
    const newSelected = new Set(selectedFolderPaths);

    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }

    // Recompute filtered images based on new selection
    let filtered = images;
    if (newSelected.size > 0) {
      filtered = images.filter(img => newSelected.has(img.parent_path));
    }
    const filteredImages = query ? searchImages(filtered, query) : filtered;

    set({
      selectedFolderPaths: newSelected,
      filteredImages,
      activeId: filteredImages[0]?.id || null,
    });
  },

  selectAllFolders: () => {
    const { allFolders, images, query } = get();
    const allPaths = new Set(allFolders.map(f => f.path));

    // When all selected, show all images (filtered only by query)
    const filteredImages = query ? searchImages(images, query) : images;

    set({
      selectedFolderPaths: allPaths,
      filteredImages,
      activeId: filteredImages[0]?.id || null,
    });
  },

  clearFolderSelection: () => {
    const { images, query } = get();
    // When cleared, show all images (filtered only by query)
    const filteredImages = query ? searchImages(images, query) : images;

    set({
      selectedFolderPaths: new Set(),
      filteredImages,
      activeId: filteredImages[0]?.id || null,
    });
  },
}));

// Apply initial dark mode on load
applyDarkMode(loadDarkMode());

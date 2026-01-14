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
import { FolderMetadata, SiblingFolderInfo } from "./commands";

interface RecentlyViewedItem {
  id: string;
  timestamp: number;
}

export interface PathSegment {
  name: string;
  fullPath: string;
}

type FolderViewMode = "overview" | "images";

interface AppStore {
  folderPath: string | null;
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
  siblingFolders: SiblingFolderInfo[];
  sidebarOpen: boolean;
  folderViewMode: FolderViewMode;
  folderMetadata: FolderMetadata | null;
  activeFolderIndex: number;

  setFolderPath: (path: string | null) => void;
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
  setSiblingFolders: (folders: SiblingFolderInfo[]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setFolderViewMode: (mode: FolderViewMode) => void;
  setFolderMetadata: (metadata: FolderMetadata | null) => void;
  navigateUp: () => string | null;
  setActiveFolderIndex: (index: number) => void;
  moveFolderActive: (direction: "up" | "down" | "left" | "right") => void;
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

// Load sidebar open state from localStorage
const loadSidebarOpen = (): boolean => {
  try {
    const stored = localStorage.getItem("sidebarOpen");
    return stored === "true";
  } catch {
    return false;
  }
};

// Save sidebar open state to localStorage
const saveSidebarOpen = (open: boolean) => {
  try {
    localStorage.setItem("sidebarOpen", String(open));
  } catch {
    // ignore
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
  siblingFolders: [],
  sidebarOpen: loadSidebarOpen(),
  folderViewMode: "images",
  folderMetadata: null,
  activeFolderIndex: 0,

  setFolderPath: (path) => {
    const segments = path ? parsePathSegments(path) : [];
    set({ folderPath: path, pathSegments: segments });
  },

  setImages: (images) => {
    const { query, groupOrder, collapsedGroups } = get();

    const alphabetized = sortImagesAlphabetically(images);
    const groups = buildImageGroups(alphabetized);
    const resolvedOrder = ensureGroupOrder(groupOrder, groups);
    const orderedImages = flattenGroupsByOrder(groups, resolvedOrder);

    // Apply search filtering if there's a query
    const filteredImages = query ? searchImages(orderedImages, query) : orderedImages;

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
    const images = get().images;
    const filteredImages = query ? searchImages(images, query) : images;
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

  setSiblingFolders: (folders) => set({ siblingFolders: folders }),

  toggleSidebar: () => {
    const newOpen = !get().sidebarOpen;
    saveSidebarOpen(newOpen);
    set({ sidebarOpen: newOpen });
  },

  setSidebarOpen: (open) => {
    saveSidebarOpen(open);
    set({ sidebarOpen: open });
  },

  setFolderViewMode: (mode) => set({ folderViewMode: mode }),

  setFolderMetadata: (metadata) => {
    set({
      folderMetadata: metadata,
      siblingFolders: metadata?.sibling_folders || [],
      folderViewMode: metadata?.has_subfolders ? "overview" : "images",
      activeFolderIndex: 0,
    });
  },

  navigateUp: () => {
    const { pathSegments } = get();
    if (pathSegments.length <= 1) return null;

    const parentSegment = pathSegments[pathSegments.length - 2];
    return parentSegment.fullPath;
  },

  setActiveFolderIndex: (index) => set({ activeFolderIndex: index }),

  moveFolderActive: (direction) => {
    const { folderMetadata, activeFolderIndex, containerWidth } = get();
    if (!folderMetadata || folderMetadata.subfolders.length === 0) return;

    const count = folderMetadata.subfolders.length;
    const cardWidth = 180 + 16; // Approximate card width + gap
    const itemsPerRow = Math.max(1, Math.floor(containerWidth / cardWidth));

    let newIndex = activeFolderIndex;

    switch (direction) {
      case "down":
        newIndex = Math.min(activeFolderIndex + itemsPerRow, count - 1);
        break;
      case "up":
        newIndex = Math.max(activeFolderIndex - itemsPerRow, 0);
        break;
      case "right":
        newIndex = Math.min(activeFolderIndex + 1, count - 1);
        break;
      case "left":
        newIndex = Math.max(activeFolderIndex - 1, 0);
        break;
    }

    set({ activeFolderIndex: newIndex });
  },
}));

// Apply initial dark mode on load
applyDarkMode(loadDarkMode());

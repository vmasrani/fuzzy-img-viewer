import { create } from "zustand";
import { ImageRecord, ViewMode } from "./types";
import { searchImages } from "./search";

interface RecentlyViewedItem {
  id: string;
  timestamp: number;
}

interface AppStore {
  folderPath: string | null;
  images: ImageRecord[];
  query: string;
  filteredImages: ImageRecord[];
  selectedIds: Set<string>;
  searchSelectedIds: Set<string>;
  activeId: string | null;
  thumbSize: number;
  viewMode: ViewMode;
  thumbnailMap: Map<string, string>;
  recentlyViewed: RecentlyViewedItem[];
  containerWidth: number;

  setFolderPath: (path: string | null) => void;
  setImages: (images: ImageRecord[]) => void;
  setQuery: (query: string) => void;
  toggleSelection: (id: string) => void;
  setActiveId: (id: string | null) => void;
  setThumbSize: (size: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setThumbnailPath: (originalPath: string, thumbPath: string) => void;
  clearSelection: () => void;
  setSearchSelectedIds: (ids: Set<string>) => void;
  toggleSearchSelection: (id: string) => void;
  clearSearchSelection: () => void;
  moveActive: (direction: "up" | "down" | "left" | "right") => void;
  markAsViewed: (id: string) => void;
  setContainerWidth: (width: number) => void;
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

// VS Code-style sorting: recently viewed first, then alphabetically
const sortImagesVSCodeStyle = (
  images: ImageRecord[],
  recentlyViewed: RecentlyViewedItem[]
): ImageRecord[] => {
  const recentlyViewedIds = new Set(recentlyViewed.map((r) => r.id));

  // Separate into recently viewed and others
  const recentImages: ImageRecord[] = [];
  const otherImages: ImageRecord[] = [];

  for (const image of images) {
    if (recentlyViewedIds.has(image.id)) {
      recentImages.push(image);
    } else {
      otherImages.push(image);
    }
  }

  // Sort recently viewed by timestamp (most recent first)
  const recentViewedMap = new Map(recentlyViewed.map((r) => [r.id, r.timestamp]));
  recentImages.sort((a, b) => {
    const timeA = recentViewedMap.get(a.id) || 0;
    const timeB = recentViewedMap.get(b.id) || 0;
    return timeB - timeA;
  });

  // Sort others alphabetically by filename
  otherImages.sort((a, b) => a.filename.localeCompare(b.filename));

  // Combine: recently viewed first, then alphabetical
  return [...recentImages, ...otherImages];
};

export const useStore = create<AppStore>((set, get) => ({
  folderPath: null,
  images: [],
  query: "",
  filteredImages: [],
  selectedIds: new Set(),
  searchSelectedIds: new Set(),
  activeId: null,
  thumbSize: 200,
  viewMode: "grid",
  thumbnailMap: new Map(),
  recentlyViewed: loadRecentlyViewed(),
  containerWidth: window.innerWidth - 24,

  setFolderPath: (path) => set({ folderPath: path }),

  setImages: (images) => {
    const { query, recentlyViewed } = get();

    // Sort images VS Code-style (recently viewed first, then alphabetical)
    const sortedImages = sortImagesVSCodeStyle(images, recentlyViewed);

    // Apply search filtering if there's a query
    const filteredImages = query ? searchImages(sortedImages, query) : sortedImages;

    set({
      images: sortedImages,
      filteredImages,
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
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),

  setActiveId: (id) => set({ activeId: id }),

  setThumbSize: (size) => set({ thumbSize: Math.max(100, Math.min(500, size)) }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setThumbnailPath: (originalPath, thumbPath) =>
    set((state) => {
      const newMap = new Map(state.thumbnailMap);
      newMap.set(originalPath, thumbPath);
      return { thumbnailMap: newMap };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setSearchSelectedIds: (ids) => set({ searchSelectedIds: ids }),

  toggleSearchSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.searchSelectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { searchSelectedIds: newSet };
    }),

  clearSearchSelection: () => set({ searchSelectedIds: new Set() }),

  setContainerWidth: (width) => set({ containerWidth: width }),

  moveActive: (direction) => {
    const { filteredImages, activeId, thumbSize, containerWidth } = get();
    if (filteredImages.length === 0) return;

    const currentIndex = filteredImages.findIndex((img) => img.id === activeId);
    if (currentIndex === -1) {
      set({ activeId: filteredImages[0].id });
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

    set({ activeId: filteredImages[newIndex].id });
  },

  markAsViewed: (id) => {
    const { recentlyViewed, images, query } = get();

    // Remove existing entry if present
    const filtered = recentlyViewed.filter((item) => item.id !== id);

    // Add to front with current timestamp
    const updated = [{ id, timestamp: Date.now() }, ...filtered];

    // Keep only last 50 items to prevent unbounded growth
    const trimmed = updated.slice(0, 50);

    // Save to localStorage
    saveRecentlyViewed(trimmed);

    // Re-sort images with updated recently viewed
    const sortedImages = sortImagesVSCodeStyle(images, trimmed);

    // Re-apply filter if there's a search query
    const filteredImages = query ? searchImages(sortedImages, query) : sortedImages;

    set({
      recentlyViewed: trimmed,
      images: sortedImages,
      filteredImages,
    });
  },
}));

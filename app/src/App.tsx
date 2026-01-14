import { useEffect, useState, useCallback } from "react";
import { useStore } from "./store";
import { scanFolder, getInitialData, getFolderInfo } from "./commands";
import { normalizePath } from "./utils";
import { SearchBar } from "./components/SearchBar";
import { Grid } from "./components/Grid";
import { Viewer } from "./components/Viewer";
import { Compare } from "./components/Compare";
import { FolderBrowser } from "./components/FolderBrowser";
import { QuickLook } from "./components/QuickLook";
import { CommandPalette } from "./components/CommandPalette";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { Breadcrumb } from "./components/Breadcrumb";
import { SiblingTabs } from "./components/SiblingTabs";
import { FolderOverview } from "./components/FolderOverview";
import { FolderSidebar } from "./components/FolderSidebar";

function KeybindingsHelp() {
  return (
    <div className="keybindings-help">
      <div className="keybinding">
        <span className="key">/</span>
        <span>search</span>
      </div>
      <div className="keybinding">
        <span className="key">↑↓←→</span>
        <span>navigate</span>
      </div>
      <div className="keybinding">
        <span className="key">⇧+↑↓←→</span>
        <span>select</span>
      </div>
      <div className="keybinding">
        <span className="key">Space</span>
        <span>preview</span>
      </div>
      <div className="keybinding">
        <span className="key">Enter</span>
        <span>detail</span>
      </div>
      <div className="keybinding">
        <span className="key">P</span>
        <span>pin</span>
      </div>
      <div className="keybinding">
        <span className="key">⌘⇧P</span>
        <span>commands</span>
      </div>
      <div className="keybinding">
        <span className="key">?</span>
        <span>help</span>
      </div>
    </div>
  );
}

export default function App() {
  const {
    folderPath,
    setFolderPath,
    setImages,
    viewMode,
    setViewMode,
    activeId,
    moveActive,
    moveQuicklook,
    setQuery,
    thumbSize,
    setThumbSize,
    selectedIds,
    filteredImages,
    selectAll,
    clearSelection,
    commandPaletteOpen,
    setCommandPaletteOpen,
    keyboardHelpOpen,
    setKeyboardHelpOpen,
    infoPanelOpen,
    setInfoPanelOpen,
    setQuicklookIndex,
    // Navigation state
    pathSegments,
    siblingFolders,
    sidebarOpen,
    folderViewMode,
    folderMetadata,
    activeFolderIndex,
    // Navigation actions
    toggleSidebar,
    setFolderViewMode,
    setFolderMetadata,
    navigateUp,
    moveFolderActive,
    // Pinned images
    pinnedImages,
    pinSelectedImages,
    togglePinActive,
    clearPinnedImages,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  // Navigate to a folder path
  const navigateToFolder = useCallback(async (path: string) => {
    try {
      // Set the folder path (also updates path segments)
      setFolderPath(path);

      // Get folder metadata
      const metadata = await getFolderInfo(path);
      setFolderMetadata(metadata);

      // If there are no subfolders or user bypasses overview, scan images
      if (!metadata.has_subfolders) {
        const images = await scanFolder(path);
        setImages(images);
      }
    } catch (error) {
      console.error("Failed to navigate to folder:", error);
    }
  }, [setFolderPath, setFolderMetadata, setImages]);

  // Fetch initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await getInitialData();
        if (data.folder_path && data.images) {
          setFolderPath(data.folder_path);
          setImages(data.images);

          // Also load folder metadata
          try {
            const metadata = await getFolderInfo(data.folder_path);
            setFolderMetadata(metadata);
          } catch {
            // Ignore - metadata is optional
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setFolderPath, setImages, setFolderMetadata]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields (except specific keys)
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).blur();
        }
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Command palette: Cmd+Shift+P
      if (isMeta && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }

      // Select all: Cmd+A
      if (isMeta && e.key === "a") {
        e.preventDefault();
        selectAll();
        return;
      }

      // Deselect all: Cmd+D
      if (isMeta && e.key === "d") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Handle different modes
      switch (e.key) {
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>(".search-box")?.focus();
          break;

        case "Escape":
          // Priority: close modals first, then exit view modes, then clear
          if (commandPaletteOpen) {
            setCommandPaletteOpen(false);
          } else if (keyboardHelpOpen) {
            setKeyboardHelpOpen(false);
          } else if (viewMode === "quicklook") {
            setViewMode("grid");
          } else if (viewMode !== "grid") {
            setViewMode("grid");
          } else if (selectedIds.size > 0) {
            clearSelection();
          } else {
            setQuery("");
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("prev");
          } else if (viewMode === "grid" && folderViewMode === "overview") {
            moveFolderActive("up");
          } else if (viewMode === "grid") {
            moveActive("up", e.shiftKey);
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("next");
          } else if (viewMode === "grid" && folderViewMode === "overview") {
            moveFolderActive("down");
          } else if (viewMode === "grid") {
            moveActive("down", e.shiftKey);
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("prev");
          } else if (viewMode === "grid" && folderViewMode === "overview") {
            moveFolderActive("left");
          } else if (viewMode === "grid") {
            moveActive("left", e.shiftKey);
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("next");
          } else if (viewMode === "grid" && folderViewMode === "overview") {
            moveFolderActive("right");
          } else if (viewMode === "grid") {
            moveActive("right", e.shiftKey);
          }
          break;

        case "Enter":
          if (viewMode === "grid") {
            if (folderViewMode === "overview" && folderMetadata) {
              // In folder overview, enter selected folder
              const selectedFolder = folderMetadata.subfolders[activeFolderIndex];
              if (selectedFolder) {
                navigateToFolder(selectedFolder.path);
              }
            } else if (selectedIds.size > 1) {
              setViewMode("compare");
            } else if (activeId) {
              setViewMode("viewer");
            }
          }
          break;

        case "Backspace":
          // Navigate up one level
          if (!isMeta && viewMode === "grid") {
            const parentPath = navigateUp();
            if (parentPath) {
              navigateToFolder(parentPath);
            }
          }
          break;

        case "b":
        case "B":
          // Toggle sidebar
          if (!isMeta) {
            toggleSidebar();
          }
          break;

        case "[":
          // Previous sibling folder (only folders with images)
          if (!isMeta && siblingFolders.length > 0 && folderPath) {
            const normalizedCurrent = normalizePath(folderPath);
            const seen = new Set<string>();
            const allFolders: string[] = [];
            // Only include siblings with images
            for (const s of siblingFolders) {
              const n = normalizePath(s.path);
              if (n && !seen.has(n) && s.image_count > 0) {
                seen.add(n);
                allFolders.push(n);
              }
            }
            // Always include current folder
            if (normalizedCurrent && !seen.has(normalizedCurrent)) {
              allFolders.push(normalizedCurrent);
            }
            allFolders.sort();
            const currentIndex = allFolders.indexOf(normalizedCurrent);
            if (currentIndex > 0) {
              navigateToFolder(allFolders[currentIndex - 1]);
            }
          }
          break;

        case "]":
          // Next sibling folder (only folders with images)
          if (!isMeta && siblingFolders.length > 0 && folderPath) {
            const normalizedCurrent = normalizePath(folderPath);
            const seen = new Set<string>();
            const allFolders: string[] = [];
            // Only include siblings with images
            for (const s of siblingFolders) {
              const n = normalizePath(s.path);
              if (n && !seen.has(n) && s.image_count > 0) {
                seen.add(n);
                allFolders.push(n);
              }
            }
            // Always include current folder
            if (normalizedCurrent && !seen.has(normalizedCurrent)) {
              allFolders.push(normalizedCurrent);
            }
            allFolders.sort();
            const currentIndex = allFolders.indexOf(normalizedCurrent);
            if (currentIndex < allFolders.length - 1) {
              navigateToFolder(allFolders[currentIndex + 1]);
            }
          }
          break;

        case " ": // Space - Quick Look toggle (Finder style)
          e.preventDefault();
          if (viewMode === "quicklook") {
            setViewMode("grid");
          } else if (viewMode === "compare") {
            setViewMode("grid");
          } else if (viewMode === "grid") {
            if (selectedIds.size > 1) {
              // Multiple images selected - open compare view
              setViewMode("compare");
            } else {
              // Single or no selection - open quicklook
              const activeIndex = filteredImages.findIndex((img) => img.id === activeId);
              if (activeIndex >= 0) {
                if (selectedIds.size > 0) {
                  const selectedImages = filteredImages.filter((img) => selectedIds.has(img.id));
                  const selectedIndex = selectedImages.findIndex((img) => img.id === activeId);
                  setQuicklookIndex(selectedIndex >= 0 ? selectedIndex : 0);
                } else {
                  setQuicklookIndex(activeIndex);
                }
              }
              setViewMode("quicklook");
            }
          }
          break;


        case "g":
          if (!isMeta) {
            setViewMode("grid");
          }
          break;

        case "c":
          if (!isMeta) {
            setViewMode("compare");
          }
          break;

        case "i": // Info panel toggle
          if (!isMeta) {
            setInfoPanelOpen(!infoPanelOpen);
          }
          break;

        case "?": // Keyboard help
          setKeyboardHelpOpen(!keyboardHelpOpen);
          break;

        case "p":
        case "P":
          // Pin/unpin active image for cross-folder comparison
          if (!isMeta && viewMode === "grid" && folderViewMode === "images") {
            e.preventDefault();
            if (e.shiftKey) {
              // Shift+P: Pin all selected images
              pinSelectedImages();
            } else {
              // P: Toggle pin on active image
              togglePinActive();
            }
          }
          break;

        case "x":
        case "X":
          // Clear pinned images
          if (isMeta && e.shiftKey) {
            e.preventDefault();
            clearPinnedImages();
          }
          break;

        case "+":
        case "=":
          setThumbSize(thumbSize + 50);
          break;

        case "-":
          setThumbSize(thumbSize - 50);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    viewMode,
    activeId,
    setViewMode,
    moveActive,
    moveQuicklook,
    setQuery,
    thumbSize,
    setThumbSize,
    selectedIds,
    filteredImages,
    selectAll,
    clearSelection,
    commandPaletteOpen,
    setCommandPaletteOpen,
    keyboardHelpOpen,
    setKeyboardHelpOpen,
    infoPanelOpen,
    setInfoPanelOpen,
    setQuicklookIndex,
    // Navigation deps
    folderViewMode,
    folderMetadata,
    activeFolderIndex,
    folderPath,
    siblingFolders,
    toggleSidebar,
    navigateUp,
    moveFolderActive,
    navigateToFolder,
    // Pin actions
    pinnedImages,
    pinSelectedImages,
    togglePinActive,
    clearPinnedImages,
  ]);

  const handleSelectFolder = async (path: string) => {
    setShowFolderBrowser(false);
    await navigateToFolder(path);
  };

  // Handler for viewing all images in folder overview
  const handleViewAllImages = async () => {
    if (!folderPath) return;
    setFolderViewMode("images");
    const images = await scanFolder(folderPath);
    setImages(images);
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="empty-state">
          <h2>AquaEye Viz</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!folderPath) {
    return (
      <div className="app">
        {showFolderBrowser && (
          <FolderBrowser
            onSelect={handleSelectFolder}
            onCancel={() => setShowFolderBrowser(false)}
          />
        )}
        <div className="empty-state">
          <h2>AquaEye Viz</h2>
          <p>Image browser with fzf-like search</p>
          <p style={{ marginTop: "16px", fontSize: "14px", color: "#999" }}>
            No folder path provided via command line
          </p>
          <button onClick={() => setShowFolderBrowser(true)}>Select Folder</button>
          <div style={{ marginTop: "32px", fontSize: "12px", color: "#666" }}>
            <p>Keyboard shortcuts:</p>
            <p>/ - Search • ↑↓←→ - Navigate • Space - Preview</p>
            <p>⇧+Arrows - Select • Enter - Detail • ⌘⇧P - Commands</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${sidebarOpen ? "with-sidebar" : ""}`}>
      <div className="app-header">
        <div className="app-header-top">
          <SearchBar />
          {pinnedImages.length > 0 && (
            <div className="pinned-indicator" title="Pinned images for cross-folder comparison">
              <span className="pinned-indicator-count">{pinnedImages.length}</span>
              <span className="pinned-indicator-label">pinned</span>
              <button
                className="pinned-indicator-clear"
                onClick={clearPinnedImages}
                title="Clear all pinned images (Cmd+Shift+X)"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <Breadcrumb segments={pathSegments} onNavigate={navigateToFolder} />
        <SiblingTabs
          siblings={siblingFolders}
          currentPath={folderPath || ""}
          currentImageCount={folderMetadata?.image_count || filteredImages.length}
          onSelect={navigateToFolder}
          showOnlyWithImages={true}
        />
      </div>
      <div className="main-layout">
        <FolderSidebar
          rootPath={pathSegments[0]?.fullPath || "/"}
          currentPath={folderPath || ""}
          isOpen={sidebarOpen}
          onNavigate={navigateToFolder}
          onToggle={toggleSidebar}
        />
        <div className="main-content">
          {folderViewMode === "overview" ? (
            <FolderOverview
              onFolderSelect={navigateToFolder}
              onViewAllImages={handleViewAllImages}
            />
          ) : (
            <Grid />
          )}
        </div>
      </div>
      {viewMode === "viewer" && <Viewer />}
      {viewMode === "compare" && <Compare />}
      {viewMode === "quicklook" && <QuickLook />}
      {commandPaletteOpen && <CommandPalette />}
      {keyboardHelpOpen && <KeyboardHelp />}
      <KeybindingsHelp />
    </div>
  );
}

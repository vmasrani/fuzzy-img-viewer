import { useEffect, useState, useCallback } from "react";
import { useStore } from "./store";
import { scanFolder, getInitialData, discoverFolders } from "./commands";
import { SearchBar } from "./components/SearchBar";
import { Grid } from "./components/Grid";
import { Viewer } from "./components/Viewer";
import { Compare } from "./components/Compare";
import { FolderBrowser } from "./components/FolderBrowser";
import { QuickLook } from "./components/QuickLook";
import { CommandPalette } from "./components/CommandPalette";
import { KeyboardHelp } from "./components/KeyboardHelp";
import { Breadcrumb } from "./components/Breadcrumb";
import { FolderPills } from "./components/FolderPills";

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
    rootFolderPath,
    setFolderPath,
    setRootFolderPath,
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
    // Folder discovery and selection
    allFolders,
    selectedFolderPaths,
    setAllFolders,
    toggleFolderSelection,
    // Pinned images
    pinnedImages,
    pinSelectedImages,
    togglePinActive,
    clearPinnedImages,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  // Navigate to a folder path (just scan images - folder discovery is done at startup)
  const navigateToFolder = useCallback(async (path: string) => {
    try {
      setFolderPath(path);
      const images = await scanFolder(path);
      setImages(images);
    } catch (error) {
      console.error("Failed to navigate to folder:", error);
    }
  }, [setFolderPath, setImages]);

  // Fetch initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await getInitialData();
        if (data.folder_path && data.images) {
          setFolderPath(data.folder_path);
          setRootFolderPath(data.folder_path);
          setImages(data.images);

          // Discover ALL folders under root (cached for folder pills)
          try {
            const discovered = await discoverFolders(data.folder_path);
            setAllFolders(discovered.folders);
          } catch (err) {
            console.error("Failed to discover folders:", err);
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setFolderPath, setRootFolderPath, setImages, setAllFolders]);

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
          } else if (viewMode === "grid") {
            moveActive("up", e.shiftKey);
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("next");
          } else if (viewMode === "grid") {
            moveActive("down", e.shiftKey);
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("prev");
          } else if (viewMode === "grid") {
            moveActive("left", e.shiftKey);
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("next");
          } else if (viewMode === "grid") {
            moveActive("right", e.shiftKey);
          }
          break;

        case "Enter":
          if (viewMode === "grid") {
            if (selectedIds.size > 1) {
              setViewMode("compare");
            } else if (activeId) {
              setViewMode("viewer");
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
          if (!isMeta && viewMode === "grid") {
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
    <div className="app">
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
        <Breadcrumb segments={pathSegments} rootPath={rootFolderPath || ""} onNavigate={navigateToFolder} />
        <FolderPills
          folders={allFolders}
          selectedPaths={selectedFolderPaths}
          onToggle={toggleFolderSelection}
          showOnlyWithImages={true}
        />
      </div>
      <div className="main-content">
        <Grid />
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

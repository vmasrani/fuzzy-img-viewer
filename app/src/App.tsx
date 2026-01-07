import { useEffect, useState } from "react";
import { useStore } from "./store";
import { scanFolder, getInitialData } from "./commands";
import { SearchBar } from "./components/SearchBar";
import { Grid } from "./components/Grid";
import { Viewer } from "./components/Viewer";
import { Compare } from "./components/Compare";
import { FolderBrowser } from "./components/FolderBrowser";
import { QuickLook } from "./components/QuickLook";
import { CommandPalette } from "./components/CommandPalette";
import { KeyboardHelp } from "./components/KeyboardHelp";

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
        <span className="key">Space</span>
        <span>preview</span>
      </div>
      <div className="keybinding">
        <span className="key">Tab</span>
        <span>select</span>
      </div>
      <div className="keybinding">
        <span className="key">Enter</span>
        <span>detail</span>
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
    toggleSelection,
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
    settingsOpen,
    setSettingsOpen,
    infoPanelOpen,
    setInfoPanelOpen,
    setQuicklookIndex,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  // Fetch initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const data = await getInitialData();
        if (data.folder_path && data.images) {
          setFolderPath(data.folder_path);
          setImages(data.images);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setFolderPath, setImages]);

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

      // Settings: Cmd+,
      if (isMeta && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(!settingsOpen);
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
          } else if (settingsOpen) {
            setSettingsOpen(false);
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
            // No action for up/down in quicklook
          } else {
            moveActive("up");
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (viewMode === "quicklook") {
            // No action for up/down in quicklook
          } else {
            moveActive("down");
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("prev");
          } else {
            moveActive("left");
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (viewMode === "quicklook") {
            moveQuicklook("next");
          } else {
            moveActive("right");
          }
          break;

        case "Enter":
          if (activeId && viewMode === "grid") {
            setViewMode("viewer");
          }
          break;

        case " ": // Space - Quick Look toggle (Finder style)
          e.preventDefault();
          if (viewMode === "quicklook") {
            setViewMode("grid");
          } else if (viewMode === "grid") {
            // Set quicklook index based on current active item
            const activeIndex = filteredImages.findIndex((img) => img.id === activeId);
            if (activeIndex >= 0) {
              // If selection exists, find index within selected items
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
          break;

        case "Tab": // Tab - toggle selection and move to next (fzf style)
          e.preventDefault();
          if (activeId) {
            toggleSelection(activeId);
            if (e.shiftKey) {
              moveActive("left"); // Shift+Tab moves backward
            } else {
              moveActive("right"); // Tab moves forward
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
    toggleSelection,
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
    settingsOpen,
    setSettingsOpen,
    infoPanelOpen,
    setInfoPanelOpen,
    setQuicklookIndex,
  ]);

  const handleSelectFolder = async (path: string) => {
    setShowFolderBrowser(false);
    try {
      setFolderPath(path);
      const images = await scanFolder(path);
      setImages(images);
    } catch (error) {
      console.error("Failed to load folder:", error);
    }
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
            <p>Tab - Select • Enter - Detail • ⌘⇧P - Commands</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <SearchBar />
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

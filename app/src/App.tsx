import { useEffect, useState } from "react";
import { useStore } from "./store";
import { selectFolder, scanFolder, getInitialData } from "./commands";
import { SearchBar } from "./components/SearchBar";
import { Grid } from "./components/Grid";
import { Viewer } from "./components/Viewer";
import { Compare } from "./components/Compare";

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
        <span className="key">Enter</span>
        <span>view</span>
      </div>
      <div className="keybinding">
        <span className="key">Space</span>
        <span>select</span>
      </div>
      <div className="keybinding">
        <span className="key">g</span>
        <span>grid</span>
      </div>
      <div className="keybinding">
        <span className="key">c</span>
        <span>compare</span>
      </div>
      <div className="keybinding">
        <span className="key">Esc</span>
        <span>close</span>
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
    setQuery,
    thumbSize,
    setThumbSize,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);

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
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Escape") {
          (e.target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>(".search-box")?.focus();
          break;
        case "Escape":
          if (viewMode !== "grid") {
            setViewMode("grid");
          } else {
            setQuery("");
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          moveActive("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          moveActive("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (viewMode === "viewer") {
            moveActive("left");
          } else {
            moveActive("left");
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (viewMode === "viewer") {
            moveActive("right");
          } else {
            moveActive("right");
          }
          break;
        case "Enter":
          if (activeId && viewMode === "grid") {
            setViewMode("viewer");
          }
          break;
        case " ":
          e.preventDefault();
          if (activeId) {
            toggleSelection(activeId);
          }
          break;
        case "g":
          setViewMode("grid");
          break;
        case "c":
          setViewMode("compare");
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
    setQuery,
    thumbSize,
    setThumbSize,
  ]);

  const handleSelectFolder = async () => {
    try {
      const path = await selectFolder();
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
        <div className="empty-state">
          <h2>AquaEye Viz</h2>
          <p>Image browser with fzf-like search</p>
          <p style={{ marginTop: "16px", fontSize: "14px", color: "#999" }}>
            No folder path provided via command line
          </p>
          <button onClick={handleSelectFolder}>Select Folder Manually</button>
          <div style={{ marginTop: "32px", fontSize: "12px", color: "#666" }}>
            <p>Keyboard shortcuts:</p>
            <p>/ - Search • ↑↓←→ - Navigate • Enter - View</p>
            <p>Space - Select • g - Grid • c - Compare • Esc - Close</p>
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
      <KeybindingsHelp />
    </div>
  );
}

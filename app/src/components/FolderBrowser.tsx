import { useState, useEffect } from "react";
import { listFolders } from "../commands";

interface FolderBrowserProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function FolderBrowser({ onSelect, onCancel }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listFolders(currentPath)
      .then((data) => {
        setFolders(data.folders);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [currentPath]);

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="folder-browser-overlay" onKeyDown={handleKeyDown}>
      <div className="folder-browser">
        <div className="folder-browser-header">
          <h3>Select Folder</h3>
          <span className="folder-browser-path">{currentPath || "~"}</span>
        </div>
        <div className="folder-browser-actions">
          <button onClick={goUp} disabled={!currentPath}>
            ↑ Up
          </button>
          <button
            onClick={() => onSelect(currentPath)}
            disabled={!currentPath}
            className="primary"
          >
            Select This Folder
          </button>
        </div>
        <div className="folder-browser-list">
          {loading ? (
            <div className="folder-browser-loading">Loading...</div>
          ) : error ? (
            <div className="folder-browser-error">{error}</div>
          ) : folders.length === 0 ? (
            <div className="folder-browser-empty">No subfolders</div>
          ) : (
            folders.map((folder) => (
              <div
                key={folder}
                className="folder-browser-item"
                onClick={() => setCurrentPath(folder)}
              >
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder.split("/").pop()}</span>
              </div>
            ))
          )}
        </div>
        <div className="folder-browser-footer">
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

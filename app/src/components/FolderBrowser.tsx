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
                <span className="folder-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
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

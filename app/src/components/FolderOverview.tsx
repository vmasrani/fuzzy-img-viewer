import { useStore } from "../store";
import { FolderCard } from "./FolderCard";

interface FolderOverviewProps {
  onFolderSelect: (path: string) => void;
  onViewAllImages: () => void;
}

export function FolderOverview({ onFolderSelect, onViewAllImages }: FolderOverviewProps) {
  const {
    folderMetadata,
    activeFolderIndex,
    setActiveFolderIndex,
  } = useStore();

  if (!folderMetadata || folderMetadata.subfolders.length === 0) {
    return null;
  }

  const handleFolderClick = (index: number) => {
    setActiveFolderIndex(index);
  };

  const handleFolderDoubleClick = (path: string) => {
    onFolderSelect(path);
  };

  return (
    <div className="folder-overview">
      <div className="folder-overview-header">
        <h2 className="folder-overview-title">
          {folderMetadata.subfolders.length} folder{folderMetadata.subfolders.length !== 1 ? "s" : ""}
        </h2>
        {folderMetadata.image_count > 0 && (
          <button className="folder-overview-view-all" onClick={onViewAllImages}>
            View all {folderMetadata.image_count} images
          </button>
        )}
      </div>
      <div className="folder-overview-grid">
        {folderMetadata.subfolders.map((folder, index) => (
          <FolderCard
            key={folder.path}
            folder={folder}
            isActive={index === activeFolderIndex}
            onClick={() => handleFolderClick(index)}
            onDoubleClick={() => handleFolderDoubleClick(folder.path)}
          />
        ))}
      </div>
    </div>
  );
}

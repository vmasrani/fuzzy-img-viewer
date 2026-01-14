import { useEffect, useState, useCallback } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { listFolders } from "../commands";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isOpen?: boolean;
}

interface FolderSidebarProps {
  rootPath: string;
  currentPath: string;
  isOpen: boolean;
  onNavigate: (path: string) => void;
  onToggle: () => void;
}

function FolderNode({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const isSelected = node.isSelected;
  const isOpen = node.isOpen;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`folder-tree-node ${isSelected ? "selected" : ""}`}
      onClick={() => node.select()}
      onDoubleClick={() => {
        if (hasChildren) {
          node.toggle();
        }
      }}
    >
      <span className="folder-tree-arrow" onClick={() => hasChildren && node.toggle()}>
        {hasChildren ? (isOpen ? "▼" : "▶") : "  "}
      </span>
      <svg
        className="folder-tree-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <span className="folder-tree-name" title={node.data.id}>
        {node.data.name}
      </span>
    </div>
  );
}

export function FolderSidebar({
  rootPath,
  currentPath,
  isOpen,
  onNavigate,
  onToggle,
}: FolderSidebarProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Build tree from root path
  const loadTree = useCallback(async () => {
    if (!rootPath) return;

    setLoading(true);

    try {
      // Get initial folders from root
      const response = await listFolders(rootPath);
      const nodes: TreeNode[] = response.folders
        .filter((f) => !f.split("/").pop()?.startsWith("."))
        .map((folderPath) => ({
          id: folderPath,
          name: folderPath.split("/").pop() || folderPath,
          children: undefined,
        }));

      setTreeData(nodes);
    } catch (error) {
      console.error("Failed to load folder tree:", error);
    } finally {
      setLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    if (isOpen) {
      loadTree();
    }
  }, [isOpen, loadTree]);

  // Load children when a node is expanded
  const handleToggle = async (id: string) => {
    try {
      const response = await listFolders(id);
      const children: TreeNode[] = response.folders
        .filter((f) => !f.split("/").pop()?.startsWith("."))
        .map((folderPath) => ({
          id: folderPath,
          name: folderPath.split("/").pop() || folderPath,
          children: undefined,
        }));

      setTreeData((prev) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((node) => {
            if (node.id === id) {
              return { ...node, children: children.length > 0 ? children : [] };
            }
            if (node.children) {
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        };
        return updateNode(prev);
      });
    } catch (error) {
      console.error("Failed to load children:", error);
    }
  };

  if (!isOpen) {
    return (
      <button className="sidebar-toggle sidebar-toggle-closed" onClick={onToggle} title="Open sidebar (B)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="folder-sidebar">
      <div className="folder-sidebar-header">
        <span className="folder-sidebar-title">Folders</span>
        <button className="sidebar-toggle" onClick={onToggle} title="Close sidebar (B)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="folder-sidebar-content">
        {loading ? (
          <div className="folder-sidebar-loading">Loading...</div>
        ) : treeData.length === 0 ? (
          <div className="folder-sidebar-empty">No folders found</div>
        ) : (
          <Tree
            data={treeData}
            openByDefault={false}
            width="100%"
            height={400}
            indent={16}
            rowHeight={28}
            onToggle={(id) => handleToggle(id)}
            onSelect={(nodes) => {
              const selected = nodes[0];
              if (selected) {
                onNavigate(selected.id);
              }
            }}
            selection={currentPath}
          >
            {FolderNode}
          </Tree>
        )}
      </div>
    </div>
  );
}

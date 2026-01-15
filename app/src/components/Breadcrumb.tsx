import { PathSegment } from "../store";
import { normalizePath } from "../utils";

interface BreadcrumbProps {
  segments: PathSegment[];
  rootPath: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ segments, rootPath, onNavigate }: BreadcrumbProps) {
  if (segments.length === 0) return null;

  const normalizedRoot = normalizePath(rootPath);

  return (
    <nav className="breadcrumb" aria-label="Folder navigation">
      <ol className="breadcrumb-list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const normalizedSegment = normalizePath(segment.fullPath);
          // A segment is navigable if it's at or below the root folder
          const isNavigable = normalizedRoot && normalizedSegment.startsWith(normalizedRoot);

          return (
            <li key={segment.fullPath} className="breadcrumb-item">
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              {isLast ? (
                <span className="breadcrumb-current">{segment.name}</span>
              ) : isNavigable ? (
                <button
                  className="breadcrumb-link"
                  onClick={() => onNavigate(segment.fullPath)}
                  title={segment.fullPath}
                >
                  {segment.name}
                </button>
              ) : (
                <span className="breadcrumb-disabled" title={segment.fullPath}>
                  {segment.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { PathSegment } from "../store";

interface BreadcrumbProps {
  segments: PathSegment[];
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ segments, onNavigate }: BreadcrumbProps) {
  if (segments.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Folder navigation">
      <ol className="breadcrumb-list">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <li key={segment.fullPath} className="breadcrumb-item">
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              {isLast ? (
                <span className="breadcrumb-current">{segment.name}</span>
              ) : (
                <button
                  className="breadcrumb-link"
                  onClick={() => onNavigate(segment.fullPath)}
                  title={segment.fullPath}
                >
                  {segment.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

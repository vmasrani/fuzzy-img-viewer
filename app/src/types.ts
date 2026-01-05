export interface ImageMetadata {
  date: string | null;
  subject: string | null;
  series: string | null;
  a: number | null;
  b: number | null;
  frame: number | null;
  tokens: string[];
}

export interface ImageRecord {
  id: string;
  path: string;
  filename: string;
  metadata: ImageMetadata;
  mtime: number;
  size_bytes: number;
  search_key: string;
  thumb_path?: string;
}

export type ViewMode = "grid" | "viewer" | "compare";

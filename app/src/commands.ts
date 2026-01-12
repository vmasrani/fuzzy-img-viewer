import { ImageRecord } from "./types";

const API_BASE = "/api";

export interface InitialData {
  folder_path: string | null;
  images: ImageRecord[] | null;
}

export interface FolderListResponse {
  folders: string[];
}

export async function getInitialData(): Promise<InitialData> {
  const response = await fetch(`${API_BASE}/initial`);

  if (!response.ok) {
    throw new Error(`Failed to get initial data: ${response.statusText}`);
  }

  return response.json();
}

export async function listFolders(path: string = ""): Promise<FolderListResponse> {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await fetch(`${API_BASE}/folders${params}`);

  if (!response.ok) {
    throw new Error(`Failed to list folders: ${response.statusText}`);
  }

  return response.json();
}

export async function scanFolder(folderPath: string): Promise<ImageRecord[]> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_path: folderPath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to scan folder: ${response.statusText}`);
  }

  return response.json();
}

export async function ensureThumbnails(
  pathsAndMtimes: [string, number][],
  size: number
): Promise<[string, string][]> {
  const response = await fetch(`${API_BASE}/thumbnails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paths_and_mtimes: pathsAndMtimes,
      size,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to ensure thumbnails: ${response.statusText}`);
  }

  return response.json();
}

// Convert a file path to a URL that can be served by our backend
export function convertFileSrc(filePath: string): string {
  const encodedPath = encodeURIComponent(filePath);
  return `${API_BASE}/image/${encodedPath}`;
}

import { ImageRecord } from "./types";

export type GroupingType = "natural" | "folder";

export interface ImageGroup {
  key: string;
  label: string;
  description?: string;
  type: GroupingType;
  images: ImageRecord[];
}

const GROUP_SEPARATORS = ["-", "_"];

const localeOptions: Intl.CollatorOptions = {
  numeric: true,
  sensitivity: "base",
};

export function sortImagesAlphabetically(images: ImageRecord[]): ImageRecord[] {
  return [...images].sort((a, b) => {
    const primary = a.filename.localeCompare(b.filename, undefined, localeOptions);
    if (primary !== 0) return primary;
    return a.path.localeCompare(b.path, undefined, localeOptions);
  });
}

function getFilenameStem(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return filename;
  }
  return filename.slice(0, lastDot);
}

function getNaturalPrefix(stem: string): string | null {
  let bestIdx = -1;
  for (const separator of GROUP_SEPARATORS) {
    const idx = stem.lastIndexOf(separator);
    if (idx > bestIdx) {
      bestIdx = idx;
    }
  }

  if (bestIdx <= 0) {
    return null;
  }
  return stem.slice(0, bestIdx);
}

function formatFolderLabel(path: string | null): { label: string; description?: string } {
  if (!path) {
    return { label: "Root", description: undefined };
  }

  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/");
  const label = parts[parts.length - 1] || normalized;

  return {
    label,
    description: normalized,
  };
}

export function buildImageGroups(images: ImageRecord[]): ImageGroup[] {
  if (images.length === 0) {
    return [];
  }

  const prefixCounts = new Map<string, number>();

  const stems = images.map((image) => {
    const stem = getFilenameStem(image.filename);
    const prefix = getNaturalPrefix(stem);
    if (prefix) {
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    }
    return { image, stem, prefix };
  });

  const groups = new Map<string, ImageGroup>();

  for (const { image, prefix } of stems) {
    const useNatural = prefix && (prefixCounts.get(prefix) ?? 0) > 1;

    let key: string;
    let label: string;
    let description: string | undefined;
    let type: GroupingType;

    if (useNatural) {
      key = `natural:${prefix}`;
      label = prefix;
      description = image.parent_path || undefined;
      type = "natural";
    } else {
      const folderInfo = formatFolderLabel(image.parent_path);
      key = `folder:${image.parent_path ?? "root"}`;
      label = folderInfo.label;
      description = folderInfo.description;
      type = "folder";
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        description,
        type,
        images: [],
      });
    }

    groups.get(key)!.images.push(image);
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => a.label.localeCompare(b.label, undefined, localeOptions));
  return result;
}

export function ensureGroupOrder(order: string[], groups: ImageGroup[]): string[] {
  const existingIds = new Set(groups.map((group) => group.key));
  const filteredOrder = order.filter((id) => existingIds.has(id));
  const missing = groups
    .map((group) => group.key)
    .filter((id) => !filteredOrder.includes(id));

  return [...filteredOrder, ...missing];
}

export function flattenGroupsByOrder(groups: ImageGroup[], order: string[]): ImageRecord[] {
  const orderedGroups = sortGroupsByOrder(groups, order);
  return orderedGroups.flatMap((group) => group.images);
}

export function sortGroupsByOrder(groups: ImageGroup[], order: string[]): ImageGroup[] {
  const orderMap = new Map(order.map((id, index) => [id, index]));

  return [...groups].sort((a, b) => {
    const aOrder = orderMap.has(a.key) ? orderMap.get(a.key)! : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(b.key) ? orderMap.get(b.key)! : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.label.localeCompare(b.label, undefined, localeOptions);
  });
}

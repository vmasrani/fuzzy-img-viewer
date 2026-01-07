import fuzzysort from "fuzzysort";
import { ImageRecord } from "./types";

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

// Pre-prepare search keys for better performance
let preparedImages: { image: ImageRecord; prepared: Fuzzysort.Prepared }[] = [];
let lastImages: ImageRecord[] = [];

function ensurePrepared(images: ImageRecord[]) {
  if (images !== lastImages) {
    preparedImages = images.map((image) => ({
      image,
      prepared: fuzzysort.prepare(image.search_key),
    }));
    lastImages = images;
  }
}

export function searchImages(images: ImageRecord[], query: string): ImageRecord[] {
  if (!query.trim()) {
    return images;
  }

  ensurePrepared(images);

  const results = fuzzysort.go(query, preparedImages, {
    key: "prepared",
    limit: 1000,
    threshold: -10000,
  });

  return results.map((r) => r.obj.image);
}

export function getHighlightSegments(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) {
    return [{ text, isMatch: false }];
  }

  const result = fuzzysort.single(query, text);
  if (!result) {
    return [{ text, isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  let lastIdx = 0;

  const indexes = fuzzysort.indexes(result).map((idx) => Number(idx));

  for (const idx of indexes) {
    if (idx > lastIdx) {
      segments.push({ text: text.slice(lastIdx, idx), isMatch: false });
    }
    segments.push({ text: text[idx], isMatch: true });
    lastIdx = idx + 1;
  }

  if (lastIdx < text.length) {
    segments.push({ text: text.slice(lastIdx), isMatch: false });
  }

  return segments;
}

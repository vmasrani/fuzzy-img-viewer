import { ImageRecord } from "./types";

interface Match {
  index: number;
  score: number;
  positions: number[];
}

function fuzzyMatch(query: string, text: string): Match | null {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (queryLower.length === 0) {
    return { index: 0, score: 0, positions: [] };
  }

  let score = 0;
  let queryIdx = 0;
  let textIdx = 0;
  const positions: number[] = [];
  let consecutiveMatches = 0;

  while (queryIdx < queryLower.length && textIdx < textLower.length) {
    if (queryLower[queryIdx] === textLower[textIdx]) {
      positions.push(textIdx);
      score += 1 + consecutiveMatches;
      consecutiveMatches++;
      queryIdx++;
    } else {
      consecutiveMatches = 0;
    }
    textIdx++;
  }

  if (queryIdx < queryLower.length) {
    return null;
  }

  const distancePenalty = positions.length > 0 ? positions[positions.length - 1] - positions[0] : 0;
  score -= distancePenalty * 0.1;

  if (positions.length > 0 && positions[0] === 0) {
    score += 10;
  }

  return { index: positions[0] || 0, score, positions };
}

export function searchImages(
  images: ImageRecord[],
  query: string
): ImageRecord[] {
  if (!query.trim()) {
    return images;
  }

  const matches: Array<{ image: ImageRecord; score: number }> = [];

  for (const image of images) {
    const match = fuzzyMatch(query, image.search_key);
    if (match) {
      matches.push({ image, score: match.score });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return matches.map((m) => m.image);
}

export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) {
    return text;
  }

  const match = fuzzyMatch(query, text);
  if (!match) {
    return text;
  }

  let result = "";
  let lastIdx = 0;

  for (const pos of match.positions) {
    result += text.slice(lastIdx, pos);
    result += `<mark>${text[pos]}</mark>`;
    lastIdx = pos + 1;
  }

  result += text.slice(lastIdx);
  return result;
}

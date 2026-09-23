import { splitSentences, type Sentence } from './sentences';

export type Segment = {
  text: string;
  start: number;
  locator: Record<string, string | number>;
};

export type Chunk = {
  ordinal: number;
  text: string;
  charStart: number;
  charEnd: number;
  locator: Record<string, string | number>;
};

type Options = { target?: number; max?: number; overlap?: number };

const DEFAULTS = { target: 1000, max: 1400, overlap: 150 };

/** Sentence-aware packing inside each segment; never crosses segments. */
export function chunkSegments(
  segments: Segment[],
  options: Options = {}
): Chunk[] {
  const { target, max, overlap } = { ...DEFAULTS, ...options };
  const chunks: Chunk[] = [];
  for (const segment of segments) {
    const pieces = splitLong(segment.text, splitSentences(segment.text), max, overlap);
    let i = 0;
    while (i < pieces.length) {
      let j = i;
      while (
        j + 1 < pieces.length &&
        pieces[j + 1].end - pieces[i].start <= target
      ) {
        j++;
      }
      const start = pieces[i].start;
      const end = pieces[j].end;
      chunks.push({
        ordinal: chunks.length,
        text: segment.text.slice(start, end),
        charStart: segment.start + start,
        charEnd: segment.start + end,
        locator: segment.locator,
      });
      if (j + 1 >= pieces.length) break;
      // Step back over trailing sentences that fit in the overlap window.
      let next = j + 1;
      while (next - 1 > i && end - pieces[next - 1].start <= overlap) next--;
      i = next;
    }
  }
  return chunks;
}

/**
 * Weaker breaks, tried in order, for "sentences" longer than `max` — typical
 * of transcripts with one caption per line and no 。.
 */
const FALLBACK_BREAKS = [/\n/g, /[、，,]|\s+/g];

/**
 * Splits any sentence longer than `max`: first at single newlines, then at
 * commas or spaces, and only then by a hard cut. Hard cuts are `overlap`
 * sized so the packer's overlap still applies across them.
 */
function splitLong(
  text: string,
  sentences: Sentence[],
  max: number,
  overlap: number
): Sentence[] {
  const out: Sentence[] = [];
  const visit = (piece: Sentence, level: number) => {
    if (piece.end - piece.start <= max) {
      out.push(piece);
      return;
    }
    const pattern = FALLBACK_BREAKS[level];
    if (!pattern) {
      hardCut(text, piece, overlap > 0 ? Math.min(overlap, max) : max, out);
      return;
    }
    const parts = splitAt(text, piece, pattern);
    if (parts.length <= 1) {
      visit(piece, level + 1);
      return;
    }
    for (const part of parts) visit(part, level + 1);
  };
  for (const s of sentences) visit(s, 0);
  return out;
}

/** Breaks after each match; trims whitespace; offsets stay exact. */
function splitAt(text: string, piece: Sentence, pattern: RegExp): Sentence[] {
  const body = text.slice(piece.start, piece.end);
  const parts: Sentence[] = [];
  let from = 0;
  for (const match of body.matchAll(pattern)) {
    const to = match.index + match[0].length;
    pushTrimmed(text, piece.start + from, piece.start + to, parts);
    from = to;
  }
  pushTrimmed(text, piece.start + from, piece.end, parts);
  return parts;
}

function pushTrimmed(text: string, from: number, to: number, out: Sentence[]) {
  let start = from;
  let end = to;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end > start) out.push({ text: text.slice(start, end), start, end });
}

function hardCut(text: string, piece: Sentence, size: number, out: Sentence[]) {
  let at = piece.start;
  while (at < piece.end) {
    let end = Math.min(at + size, piece.end);
    // Never cut between the two halves of a surrogate pair.
    if (end < piece.end && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    out.push({ text: text.slice(at, end), start: at, end });
    at = end;
  }
}

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
    const pieces = hardSplit(splitSentences(segment.text), max);
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

/** Splits any sentence longer than `max` into max-sized pieces. */
function hardSplit(sentences: Sentence[], max: number): Sentence[] {
  const out: Sentence[] = [];
  for (const s of sentences) {
    if (s.text.length <= max) {
      out.push(s);
      continue;
    }
    for (let at = s.start; at < s.end; at += max) {
      const end = Math.min(at + max, s.end);
      out.push({
        text: s.text.slice(at - s.start, end - s.start),
        start: at,
        end,
      });
    }
  }
  return out;
}

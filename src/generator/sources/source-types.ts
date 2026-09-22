export const SOURCE_KINDS = ['text', 'article', 'pdf', 'youtube'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_STATUSES = [
  'pending',
  'processing',
  'ready',
  'stored',
  'needs_transcript',
  'failed',
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export type ChapterMeta = {
  title: string;
  startS: number;
  endS: number | null;
  charStart: number;
  charEnd: number;
};

/** Chunk ordinals, not ids: ordinals are stable when chunks are rewritten. */
export type DigestPoint = { text: string; chunkOrdinals: number[] };
export type DigestSection = { label: string; points: DigestPoint[] };

export type SourceMeta = {
  chapters?: ChapterMeta[];
  digest?: DigestSection[];
  pageCount?: number;
  fileSize?: number;
  durationS?: number;
  channel?: string;
};

/** Max characters for a pasted text source (≈ a long transcript). */
export const MAX_TEXT_SOURCE_CHARS = 400_000;

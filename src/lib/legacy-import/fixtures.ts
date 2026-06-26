import type { ContentCategory } from '@/types';
import { LEGACY_HOST, PATH_SEGMENT_TO_CATEGORY } from './types';

export function fixturePathForUrl(
  url: string
): { category: ContentCategory; slug: string; relPath: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.hostname !== LEGACY_HOST) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const category = PATH_SEGMENT_TO_CATEGORY[segments[0] ?? ''];
  if (!category) return null; // unknown segment (e.g. "category")

  const slug = segments[segments.length - 1];
  if (!slug || segments.length < 2) return null; // listing page, no article slug

  return { category, slug, relPath: `${category}/${slug}.html` };
}

export function normalizeForSnapshot<
  T extends { blocks: Array<Record<string, unknown>> },
>(payload: T): T {
  return {
    ...payload,
    blocks: payload.blocks.map((b) => ({ ...b, id: '<id>' })),
  };
}

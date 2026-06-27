import type { ArticleStatus } from '@/types';

export const DASHBOARD_STATUSES: ArticleStatus[] = [
  'draft',
  'published',
  'archived',
];

/**
 * Parse the multi-select status URL param (e.g. "draft,published") into a
 * deduped list of valid statuses, preserving the canonical order. An empty or
 * missing value means "all" → `[]`.
 */
export function parseStatusesParam(
  v: string | null | undefined
): ArticleStatus[] {
  if (!v) return [];
  const requested = new Set(
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return DASHBOARD_STATUSES.filter((s) => requested.has(s));
}

/** Serialize selected statuses back to a URL param, or `null` when empty (= all). */
export function serializeStatuses(statuses: ArticleStatus[]): string | null {
  const valid = DASHBOARD_STATUSES.filter((s) => statuses.includes(s));
  return valid.length ? valid.join(',') : null;
}

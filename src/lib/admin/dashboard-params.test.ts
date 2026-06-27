import { describe, expect, it } from 'vitest';
import { parseStatusesParam, serializeStatuses } from './dashboard-params';

describe('parseStatusesParam', () => {
  it('returns [] for null/empty (= all)', () => {
    expect(parseStatusesParam(null)).toEqual([]);
    expect(parseStatusesParam('')).toEqual([]);
    expect(parseStatusesParam('   ')).toEqual([]);
  });

  it('parses a comma list and keeps canonical order', () => {
    expect(parseStatusesParam('published,draft')).toEqual([
      'draft',
      'published',
    ]);
  });

  it('drops invalid tokens and dedupes', () => {
    expect(parseStatusesParam('draft,bogus,draft,archived')).toEqual([
      'draft',
      'archived',
    ]);
  });
});

describe('serializeStatuses', () => {
  it('returns null when empty (= all)', () => {
    expect(serializeStatuses([])).toBeNull();
  });

  it('joins valid statuses in canonical order', () => {
    expect(serializeStatuses(['published', 'draft'])).toBe('draft,published');
  });

  it('round-trips with parseStatusesParam', () => {
    const s = serializeStatuses(['archived', 'draft']);
    expect(parseStatusesParam(s)).toEqual(['draft', 'archived']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  bulkReducer,
  findDuplicateSlugs,
  initialBulkState,
  type BulkRow,
} from './bulk-state';
import type { ImportPreviewPayload } from './types';

function init(urls: string[]) {
  return bulkReducer(initialBulkState, { type: 'addUrls', urls });
}

function payload(slug: string): ImportPreviewPayload {
  return {
    sourceUrl: `https://www.jp.cosbe.inc/news/${slug}/`,
    category: 'notice',
    slug,
    slugCollision: false,
    title: slug,
    excerpt: '',
    featuredImageRemoteUrl: null,
    publishedAt: '2025-01-01T00:00:00.000Z',
    tags: [],
    blocks: [],
    warnings: [],
  };
}

describe('addUrls', () => {
  it('appends queued, included rows for each url', () => {
    const s = init(['a', 'b']);
    expect(s.rows).toHaveLength(2);
    expect(s.rows[0]).toMatchObject({
      url: 'a',
      status: 'queued',
      included: true,
    });
  });

  it('dedupes against urls already in the queue', () => {
    let s = init(['a', 'b']);
    s = bulkReducer(s, { type: 'addUrls', urls: ['b', 'c'] });
    expect(s.rows.map((r) => r.url)).toEqual(['a', 'b', 'c']);
  });
});

describe('removeUrls', () => {
  it('removes the listed rows', () => {
    let s = init(['a', 'b', 'c']);
    s = bulkReducer(s, { type: 'removeUrls', urls: ['a', 'c'] });
    expect(s.rows.map((r) => r.url)).toEqual(['b']);
  });
});

describe('bulkReducer', () => {
  it('setPayload marks the row ready', () => {
    let s = init(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    expect(s.rows[0].status).toBe('ready');
    expect(s.rows[0].payload?.slug).toBe('a');
  });

  it('setStatus records an error message', () => {
    let s = init(['a']);
    s = bulkReducer(s, {
      type: 'setStatus',
      url: 'a',
      status: 'error',
      error: '404',
    });
    expect(s.rows[0]).toMatchObject({ status: 'error', error: '404' });
  });

  it('patchPayload merges into the row payload', () => {
    let s = init(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, {
      type: 'patchPayload',
      url: 'a',
      patch: { slug: 'a2' },
    });
    expect(s.rows[0].payload?.slug).toBe('a2');
  });

  it('toggleInclude flips the flag', () => {
    let s = init(['a']);
    s = bulkReducer(s, { type: 'toggleInclude', url: 'a' });
    expect(s.rows[0].included).toBe(false);
  });

  it('setBatchInclude only affects ready rows', () => {
    let s = init(['a', 'b']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, { type: 'setBatchInclude', included: false });
    expect(s.rows[0].included).toBe(false); // a is ready
    expect(s.rows[1].included).toBe(true); // b still queued, untouched
  });

  it('reset clears all rows', () => {
    let s = init(['a', 'b']);
    s = bulkReducer(s, { type: 'reset' });
    expect(s.rows).toEqual([]);
  });
});

describe('findDuplicateSlugs', () => {
  it('returns slugs appearing more than once among ready rows', () => {
    const rows: BulkRow[] = [
      { url: '1', status: 'ready', included: true, payload: payload('dup') },
      { url: '2', status: 'ready', included: true, payload: payload('dup') },
      { url: '3', status: 'ready', included: true, payload: payload('unique') },
      { url: '4', status: 'queued', included: true },
    ];
    expect(findDuplicateSlugs(rows)).toEqual(new Set(['dup']));
  });
});

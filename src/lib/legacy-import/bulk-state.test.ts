import { describe, expect, it } from 'vitest';
import {
  bulkInit,
  bulkReducer,
  findDuplicateSlugs,
  type BulkRow,
} from './bulk-state';
import type { ImportPreviewPayload } from './types';

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

describe('bulkInit', () => {
  it('creates queued, included rows for each url', () => {
    const s = bulkInit(['a', 'b']);
    expect(s.rows).toHaveLength(2);
    expect(s.rows[0]).toMatchObject({
      url: 'a',
      status: 'queued',
      included: true,
    });
  });
});

describe('bulkReducer', () => {
  it('setPayload marks the row ready', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    expect(s.rows[0].status).toBe('ready');
    expect(s.rows[0].payload?.slug).toBe('a');
  });

  it('setStatus records an error message', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, {
      type: 'setStatus',
      url: 'a',
      status: 'error',
      error: '404',
    });
    expect(s.rows[0]).toMatchObject({ status: 'error', error: '404' });
  });

  it('patchPayload merges into the row payload', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, {
      type: 'patchPayload',
      url: 'a',
      patch: { slug: 'a2' },
    });
    expect(s.rows[0].payload?.slug).toBe('a2');
  });

  it('toggleInclude flips the flag', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'toggleInclude', url: 'a' });
    expect(s.rows[0].included).toBe(false);
  });

  it('setBatchInclude only affects ready rows', () => {
    let s = bulkInit(['a', 'b']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, { type: 'setBatchInclude', included: false });
    expect(s.rows[0].included).toBe(false); // a is ready
    expect(s.rows[1].included).toBe(true); // b still queued, untouched
  });

  it('setCommitted records the draft id', () => {
    let s = bulkInit(['a']);
    s = bulkReducer(s, { type: 'setPayload', url: 'a', payload: payload('a') });
    s = bulkReducer(s, { type: 'setCommitted', url: 'a', draftId: 'draft-1' });
    expect(s.rows[0]).toMatchObject({
      status: 'committed',
      draftId: 'draft-1',
    });
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

import { describe, expect, it } from 'vitest';
import { articleListPatch, importedListItem } from './article-optimistic';

describe('articleListPatch', () => {
  it('stamps published and clears publishedAt on unpublish', () => {
    expect(articleListPatch('publish')).toEqual({
      status: 'published',
      publishedAt: expect.any(String),
    });
    expect(articleListPatch('unpublish')).toEqual({
      status: 'draft',
      publishedAt: null,
    });
    expect(articleListPatch('archive')).toEqual({ status: 'archived' });
    expect(articleListPatch('restore')).toEqual({ status: 'draft' });
  });
});

describe('importedListItem', () => {
  it('builds a draft list row from a successful import', () => {
    const item = importedListItem('imp-1', {
      sourceUrl: 'https://www.jp.cosbe.inc/useful-info/ok/',
      category: 'useful-info',
      slug: 'ok',
      title: '  OK title  ',
      excerpt: '  blurb  ',
      publishedAt: '2026-01-01T00:00:00.000Z',
      tags: ['a'],
    });
    expect(item).toMatchObject({
      id: 'imp-1',
      slug: 'ok',
      title: 'OK title',
      excerpt: 'blurb',
      category: 'useful-info',
      status: 'draft',
      sourceUrl: 'https://www.jp.cosbe.inc/useful-info/ok/',
      publishedAt: '2026-01-01T00:00:00.000Z',
      tags: ['a'],
    });
  });
});

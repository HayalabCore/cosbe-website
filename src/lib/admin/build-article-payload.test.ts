import { describe, expect, it } from 'vitest';
import { buildArticlePayload } from './build-article-payload';
import type { ContentBlock } from '@/types';

const blocks: ContentBlock[] = [
  { id: 'h1', type: 'heading', level: 2, content: '見出し' },
  { id: 'p1', type: 'paragraph', content: '<p>hello world</p>' },
  { id: 't1', type: 'table', headers: ['A'], rows: [['1']] },
  { id: 'd1', type: 'divider' },
];

function args(
  overrides: Partial<Parameters<typeof buildArticlePayload>[0]> = {}
) {
  return {
    title: 'My Post',
    titleEn: ' My EN ',
    slug: 'my-post',
    excerpt: 'excerpt',
    excerptEn: ' excerpt en ',
    featuredImage: ' https://cdn.example/a.png ',
    showFeaturedImage: false,
    category: 'useful-info' as const,
    tagsStr: 'a, b, ,c',
    status: 'draft' as const,
    authorName: 'Ada',
    authorDesignation: 'Editor',
    authorAvatarUrl: ' https://cdn.example/av.png ',
    authorAvatarDirty: false,
    seo: {},
    blocks,
    untitledFallback: 'Untitled',
    currentPublishedAt: null,
    caseStudy: { aiModels: [], clientName: 'Acme' },
    ...overrides,
  };
}

describe('buildArticlePayload', () => {
  it('uses untitled fallback when title is empty', () => {
    expect(buildArticlePayload(args({ title: '' })).title).toBe('Untitled');
  });

  it('derives slug from title when slug is empty', () => {
    const p = buildArticlePayload(args({ slug: '', title: 'Hello World' }));
    expect(p.slug).toBe('hello-world');
  });

  it('splits and trims tags, dropping empties', () => {
    expect(buildArticlePayload(args()).tags).toEqual(['a', 'b', 'c']);
  });

  it('omits caseStudy unless category is case-study', () => {
    expect(buildArticlePayload(args()).caseStudy).toBeUndefined();
    expect(
      buildArticlePayload(args({ category: 'case-study' })).caseStudy
    ).toEqual({ aiModels: [], clientName: 'Acme' });
  });

  it('omits author.avatarUrl when not dirty', () => {
    expect(buildArticlePayload(args()).author.avatarUrl).toBeUndefined();
  });

  it('sends trimmed avatarUrl when dirty, including empty string', () => {
    expect(
      buildArticlePayload(args({ authorAvatarDirty: true })).author.avatarUrl
    ).toBe('https://cdn.example/av.png');
    expect(
      buildArticlePayload(
        args({ authorAvatarDirty: true, authorAvatarUrl: '  ' })
      ).author.avatarUrl
    ).toBe('');
  });

  it('stamps publishedAt on first publish and keeps existing', () => {
    const first = buildArticlePayload(args({ status: 'published' }));
    expect(first.publishedAt).toBeTruthy();
    const kept = buildArticlePayload(
      args({
        status: 'published',
        currentPublishedAt: '2020-01-01T00:00:00.000Z',
      })
    );
    expect(kept.publishedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('clears publishedAt when status is not published', () => {
    expect(
      buildArticlePayload(
        args({
          status: 'draft',
          currentPublishedAt: '2020-01-01T00:00:00.000Z',
        })
      ).publishedAt
    ).toBeNull();
  });

  it('round-trips showFeaturedImage and featuredImage', () => {
    const p = buildArticlePayload(args());
    expect(p.showFeaturedImage).toBe(false);
    expect(p.featuredImage).toBe('https://cdn.example/a.png');
  });

  it('accepts every block type in the fixture without throwing', () => {
    expect(buildArticlePayload(args()).blocks).toHaveLength(4);
  });

  it('trims titleEn/excerptEn empty to undefined', () => {
    const p = buildArticlePayload(args({ titleEn: '  ', excerptEn: '  ' }));
    expect(p.titleEn).toBeUndefined();
    expect(p.excerptEn).toBeUndefined();
  });
});

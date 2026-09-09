import type { Article, ArticleListItem } from '@/types';

export function listItem(
  overrides: Partial<ArticleListItem> = {}
): ArticleListItem {
  return {
    id: 'art-1',
    slug: 'hello',
    title: 'Hello',
    category: 'useful-info',
    tags: [],
    author: { id: 'a1', name: 'Ada', designation: 'Editor' },
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    ...overrides,
  };
}

export function createPayload(
  overrides: Partial<Omit<Article, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: 'hello',
    title: 'Hello',
    status: 'draft',
    category: 'useful-info',
    tags: [],
    author: { id: '', name: 'Ada', designation: 'Editor' },
    blocks: [{ id: 'p1', type: 'paragraph', content: '<p>Hi</p>' }],
    toc: [],
    publishedAt: null,
    ...overrides,
  };
}

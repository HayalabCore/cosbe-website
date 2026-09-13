import type { ArticleListItem, ArticleStatus } from '@/types';

export type ArticleListMutation =
  'publish' | 'unpublish' | 'archive' | 'restore';

export function articleListPatch(
  kind: ArticleListMutation
): Partial<ArticleListItem> {
  switch (kind) {
    case 'publish':
      return { status: 'published', publishedAt: new Date().toISOString() };
    case 'unpublish':
      return { status: 'draft', publishedAt: null };
    case 'archive':
      return { status: 'archived' };
    case 'restore':
      return { status: 'draft' };
  }
}

export function importedListItem(
  id: string,
  payload: {
    sourceUrl: string;
    category: ArticleListItem['category'];
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string;
    tags: string[];
  }
): ArticleListItem {
  return {
    id,
    slug: payload.slug.trim(),
    title: payload.title.trim() || 'Untitled',
    excerpt: payload.excerpt.trim() || undefined,
    category: payload.category,
    tags: payload.tags,
    author: {
      id: 'legacy-import',
      name: 'Kenjiro Momi',
      designation: '代表取締役社長',
    },
    publishedAt: payload.publishedAt,
    createdAt: new Date().toISOString(),
    status: 'draft' satisfies ArticleStatus,
    sourceUrl: payload.sourceUrl,
  };
}

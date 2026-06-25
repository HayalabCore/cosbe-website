import 'server-only';

import { unstable_cache } from 'next/cache';
import type { GetArticlesOptions } from './articles-repository';
import {
  countArticles as countArticlesUncached,
  getArticleBySlug as getArticleBySlugUncached,
  getArticles as getArticlesUncached,
  getRelatedArticles as getRelatedArticlesUncached,
} from './articles-repository';

/** Shared tag for bulk invalidation on any article CMS change. */
export const ARTICLES_CACHE_TAG = 'articles';

export function articleSlugCacheTag(slug: string): string {
  return `article-slug-${slug}`;
}

export function articlesListCacheTag(key: string): string {
  return `articles-list-${key}`;
}

export function articleRelatedCacheTag(articleId: string): string {
  return `article-related-${articleId}`;
}

function listCacheKey(options: GetArticlesOptions): string {
  return [
    options.category ?? '',
    options.tag ?? '',
    options.page ?? 1,
    options.pageSize ?? options.limitCount ?? '',
    options.excludeId ?? '',
  ].join(':');
}

function countCacheKey(
  options: Pick<GetArticlesOptions, 'category' | 'tag'>
): string {
  return [options.category ?? '', options.tag ?? ''].join(':');
}

export function getCachedArticles(options: GetArticlesOptions) {
  const key = listCacheKey(options);
  return unstable_cache(
    async () => getArticlesUncached(options, false),
    ['articles-list', key],
    {
      tags: [ARTICLES_CACHE_TAG, articlesListCacheTag(key)],
    }
  )();
}

export function getCachedCountArticles(
  options: Pick<GetArticlesOptions, 'category' | 'tag'> = {}
) {
  const key = countCacheKey(options);
  return unstable_cache(
    async () => countArticlesUncached(options, false),
    ['articles-count', key],
    {
      tags: [ARTICLES_CACHE_TAG, `articles-count-${key}`],
    }
  )();
}

export function getCachedArticleBySlug(slug: string) {
  return unstable_cache(
    async () => getArticleBySlugUncached(slug, false),
    ['article-slug', slug],
    {
      tags: [ARTICLES_CACHE_TAG, articleSlugCacheTag(slug)],
    }
  )();
}

export function getCachedRelatedArticles(
  articleId: string,
  relatedIds: string[]
) {
  const idsKey = relatedIds.slice(0, 6).join(',');
  return unstable_cache(
    async () => getRelatedArticlesUncached(articleId, relatedIds),
    ['article-related', articleId, idsKey],
    {
      tags: [ARTICLES_CACHE_TAG, articleRelatedCacheTag(articleId)],
    }
  )();
}

import 'server-only';

import { cache } from 'react';
import type { GetArticlesOptions } from './articles-repository';
import {
  countArticles as countArticlesUncached,
  getArticleBySlug as getArticleBySlugUncached,
  getArticles as getArticlesUncached,
} from './articles-repository';
import {
  getCachedArticleBySlug,
  getCachedArticles,
  getCachedCountArticles,
  getCachedRelatedArticles,
} from './articles-cache';

export type {
  GetArticlesOptions,
  ArticleStatusCounts,
} from './articles-repository';

export {
  getArticleById,
  getArticleByIdAdmin,
  getArticleSlugCategoryById,
  getArticleStatusCounts,
  getAuthors,
  upsertAuthor,
  createArticleRecord,
  updateArticleRecord,
  deleteArticleRecord,
  archiveArticleRecord,
  publishArticleRecord,
  unpublishArticleRecord,
  logArticleView,
} from './articles-repository';

const getPublishedArticleBySlug = cache(async (slug: string) =>
  getCachedArticleBySlug(slug)
);

/** Public reads are cached; pass `admin: true` for live admin lists. */
export async function getArticles(
  options: GetArticlesOptions = {},
  admin = false
) {
  if (admin) {
    return getArticlesUncached(options, true);
  }
  return getCachedArticles(options);
}

/** Public reads are cached; pass `admin: true` for live admin counts. */
export async function countArticles(
  options: Pick<
    GetArticlesOptions,
    'category' | 'status' | 'tag' | 'search'
  > = {},
  admin = false
) {
  if (admin) {
    return countArticlesUncached(options, true);
  }
  return getCachedCountArticles(options);
}

/**
 * Request-scoped dedupe (metadata + page) plus cross-request cache for published articles.
 */
export async function getArticleBySlug(slug: string, includeDrafts = false) {
  if (includeDrafts) {
    return getArticleBySlugUncached(slug, true);
  }
  return getPublishedArticleBySlug(slug);
}

/** Cached related-article lists for public detail pages. */
export async function getRelatedArticles(
  articleId: string,
  relatedIds: string[]
) {
  return getCachedRelatedArticles(articleId, relatedIds);
}

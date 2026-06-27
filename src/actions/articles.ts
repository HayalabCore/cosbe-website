'use server';

import { revalidatePath } from 'next/cache';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { requireUser } from '@/lib/require-user';
import {
  createArticleSchema,
  toCreateArticlePayload,
  updateArticleSchema,
  zodErrorDetails,
} from '@/lib/validation/article';
import {
  archiveArticleRecord,
  archiveArticlesRecord,
  countArticles,
  createArticleRecord,
  deleteArticleRecord,
  deleteArticlesRecord,
  getArticleByIdAdmin,
  getArticleSlugCategoryById,
  getArticleStatusCounts,
  getArticles,
  publishArticleRecord,
  publishArticlesRecord,
  unpublishArticleRecord,
  unpublishArticlesRecord,
  updateArticleRecord,
} from '@/lib/articles';
import type {
  Article,
  ArticleListItem,
  ArticleStatus,
  ContentCategory,
} from '@/types';

export async function getArticleByIdAction(
  id: string
): Promise<Article | null> {
  await requireUser();
  return getArticleByIdAdmin(id);
}

export type AdminArticleListStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
};

export async function listArticlesAdminAction(options: {
  statuses?: ArticleStatus[];
  category?: ContentCategory | 'all';
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{
  items: ArticleListItem[];
  total: number;
  stats: AdminArticleListStats;
}> {
  await requireUser();
  const statuses =
    options.statuses && options.statuses.length > 0
      ? options.statuses
      : undefined;
  const categoryFilter =
    options.category === 'all' || !options.category
      ? undefined
      : options.category;
  const search = options.search?.trim() || undefined;
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(1, options.pageSize));

  const listFilters = {
    statuses,
    category: categoryFilter,
    search,
  };

  const [items, total, stats] = await Promise.all([
    getArticles({ ...listFilters, page, pageSize }, true),
    countArticles(listFilters, true),
    getArticleStatusCounts(),
  ]);

  return { items, total, stats };
}

export async function createArticleAction(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  await requireUser();
  const parsed = createArticleSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`
    );
  }
  // Persist the validated + normalized payload (unknown keys stripped, fields
  // trimmed) rather than the raw client object — defense in depth.
  const payload = toCreateArticlePayload(parsed.data);
  const id = await createArticleRecord(payload);
  revalidateArticlePaths(payload.slug, payload.category);
  return id;
}

export async function updateArticleAction(
  id: string,
  data: Partial<Omit<Article, 'id' | 'createdAt'>>
): Promise<void> {
  await requireUser();
  const parsed = updateArticleSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`
    );
  }
  await updateArticleRecord(id, data);
  revalidateArticlePaths(data.slug, data.category);
}

/** Moves an article to 'archived' status (soft delete). */
export async function archiveArticleAction(
  id: string,
  slug: string,
  category: ContentCategory
): Promise<void> {
  await requireUser();
  await archiveArticleRecord(id);
  revalidateArticlePaths(slug, category);
}

/** Restores an archived article back to draft. */
export async function restoreArticleAction(id: string): Promise<void> {
  await requireUser();
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await updateArticleRecord(id, { status: 'draft' });
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths(meta.slug, meta.category);
}

/** Permanently deletes an article. Cannot be undone. */
export async function hardDeleteArticleAction(
  id: string,
  slug: string,
  category: ContentCategory
): Promise<void> {
  await requireUser();
  await deleteArticleRecord(id);
  revalidateArticlePaths(slug, category);
}

/**
 * Batch actions for the dashboard's multi-select. Each runs a single
 * updateMany/deleteMany then revalidates broadly (the selection can span
 * multiple categories).
 */
export async function publishArticlesAction(ids: string[]): Promise<void> {
  await requireUser();
  if (ids.length === 0) return;
  await publishArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function unpublishArticlesAction(ids: string[]): Promise<void> {
  await requireUser();
  if (ids.length === 0) return;
  await unpublishArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function archiveArticlesAction(ids: string[]): Promise<void> {
  await requireUser();
  if (ids.length === 0) return;
  await archiveArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function deleteArticlesAction(ids: string[]): Promise<void> {
  await requireUser();
  if (ids.length === 0) return;
  await deleteArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function publishArticleAction(id: string): Promise<void> {
  await requireUser();
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await publishArticleRecord(id);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths(meta.slug, meta.category);
}

export async function unpublishArticleAction(id: string): Promise<void> {
  await requireUser();
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await unpublishArticleRecord(id);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths(meta.slug, meta.category);
}

'use server';

import { revalidatePath } from 'next/cache';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { statusChangePermissions } from '@/lib/article-status-permissions';
import { requireAnyPermission, requirePermission } from '@/lib/authz';
import type { Permission } from '@/lib/permissions';
import {
  SAVE_FAILED_ERROR,
  SLUG_CONFLICT_ERROR,
  type ArticleMutationResult,
} from '@/lib/article-mutation-result';
import { isSlugUniqueConflict } from '@/lib/prisma-errors';
import {
  createArticleSchema,
  toCreateArticlePayload,
  toUpdateArticlePayload,
  updateArticleSchema,
  zodErrorDetails,
} from '@/lib/validation/article';
import {
  allocateUniqueSlug,
  archiveArticleRecord,
  archiveArticlesRecord,
  countArticles,
  createArticleRecord,
  deleteArticleRecord,
  deleteArticlesRecord,
  getArticleByIdAdmin,
  getArticleMetasByIds,
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

async function requireStatusTransitions(
  metas: { status: ArticleStatus }[],
  to: ArticleStatus
): Promise<void> {
  const needed = [
    ...new Set(metas.flatMap((m) => statusChangePermissions(m.status, to))),
  ] as Permission[];
  if (needed.length > 0) await requirePermission(...needed);
}

async function loadArticleMetasOrThrow(
  ids: string[]
): Promise<Awaited<ReturnType<typeof getArticleMetasByIds>>> {
  const unique = [...new Set(ids)];
  const metas = await getArticleMetasByIds(unique);
  if (metas.length !== unique.length) throw new Error('Not found');
  return metas;
}

export async function getArticleByIdAction(
  id: string
): Promise<Article | null> {
  await requireAnyPermission('dashboard.view', 'articles.edit');
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
  await requirePermission('dashboard.view');
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

export type CreateArticleOptions = {
  /** When true the slug was derived, so a taken value may be suffixed. */
  autoSuffixSlug?: boolean;
};

export async function createArticleAction(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>,
  options: CreateArticleOptions = {}
): Promise<ArticleMutationResult> {
  await requirePermission('articles.edit');
  const parsed = createArticleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`,
    };
  }
  // A new article counts as coming from draft (publishing needs articles.publish).
  const extra = statusChangePermissions('draft', parsed.data.status);
  if (extra.length > 0) await requirePermission(...extra);
  // Persist the validated + normalized payload (unknown keys stripped, fields
  // trimmed) rather than the raw client object — defense in depth.
  const payload = toCreateArticlePayload(parsed.data);
  try {
    const slug = options.autoSuffixSlug
      ? await allocateUniqueSlug(payload.slug)
      : payload.slug;
    const id = await createArticleRecord({ ...payload, slug });
    revalidateArticlePaths(slug, payload.category);
    return { ok: true, id, slug };
  } catch (error) {
    if (isSlugUniqueConflict(error)) {
      return { ok: false, error: SLUG_CONFLICT_ERROR };
    }
    console.error('[createArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
}

export async function updateArticleAction(
  id: string,
  data: Partial<Omit<Article, 'id' | 'createdAt'>>
): Promise<ArticleMutationResult> {
  await requirePermission('articles.edit');
  const parsed = updateArticleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid article data: ${zodErrorDetails(parsed.error).join('; ')}`,
    };
  }
  let previous: Awaited<ReturnType<typeof getArticleSlugCategoryById>>;
  try {
    previous = await getArticleSlugCategoryById(id);
  } catch (error) {
    console.error('[updateArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
  if (!previous) {
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
  // Status transitions need their own permissions on top of articles.edit.
  const extra = statusChangePermissions(
    previous.status,
    parsed.data.status ?? previous.status
  );
  if (extra.length > 0) await requirePermission(...extra);
  try {
    await updateArticleRecord(id, toUpdateArticlePayload(parsed.data));
    const nextSlug = parsed.data.slug ?? previous.slug;
    const nextCategory = parsed.data.category ?? previous.category;
    if (parsed.data.category && parsed.data.category !== previous.category) {
      revalidateArticlePaths(previous.slug, previous.category);
      revalidateArticlePaths(nextSlug, nextCategory);
    } else {
      revalidateArticlePaths(
        [...new Set([nextSlug, previous.slug])],
        nextCategory
      );
    }
    return { ok: true, id, slug: nextSlug };
  } catch (error) {
    if (isSlugUniqueConflict(error)) {
      return { ok: false, error: SLUG_CONFLICT_ERROR };
    }
    console.error('[updateArticleAction]', error);
    return { ok: false, error: SAVE_FAILED_ERROR };
  }
}

/** Moves an article to 'archived' status (soft delete). */
export async function archiveArticleAction(
  id: string,
  slug: string,
  category: ContentCategory
): Promise<void> {
  await requirePermission('articles.archive');
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await requireStatusTransitions([meta], 'archived');
  await archiveArticleRecord(id);
  revalidateArticlePaths(slug, category);
}

/** Restores an archived article back to draft. */
export async function restoreArticleAction(id: string): Promise<void> {
  await requirePermission('articles.archive');
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await requireStatusTransitions([meta], 'draft');
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
  await requirePermission('articles.delete');
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  // Treat delete as a transition through archived so published/draft
  // deletions still need archive (and publish when leaving published).
  await requireStatusTransitions([meta], 'archived');
  await deleteArticleRecord(id);
  revalidateArticlePaths(slug, category);
}

/**
 * Batch actions for the dashboard's multi-select. Each runs a single
 * updateMany/deleteMany then revalidates broadly (the selection can span
 * multiple categories).
 */
export async function publishArticlesAction(ids: string[]): Promise<void> {
  await requirePermission('articles.publish');
  if (ids.length === 0) return;
  await requireStatusTransitions(
    await loadArticleMetasOrThrow(ids),
    'published'
  );
  await publishArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function unpublishArticlesAction(ids: string[]): Promise<void> {
  await requirePermission('articles.publish');
  if (ids.length === 0) return;
  await requireStatusTransitions(await loadArticleMetasOrThrow(ids), 'draft');
  await unpublishArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function archiveArticlesAction(ids: string[]): Promise<void> {
  await requirePermission('articles.archive');
  if (ids.length === 0) return;
  await requireStatusTransitions(
    await loadArticleMetasOrThrow(ids),
    'archived'
  );
  await archiveArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function deleteArticlesAction(ids: string[]): Promise<void> {
  await requirePermission('articles.delete');
  if (ids.length === 0) return;
  await requireStatusTransitions(
    await loadArticleMetasOrThrow(ids),
    'archived'
  );
  await deleteArticlesRecord(ids);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths();
}

export async function publishArticleAction(id: string): Promise<void> {
  await requirePermission('articles.publish');
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await requireStatusTransitions([meta], 'published');
  await publishArticleRecord(id);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths(meta.slug, meta.category);
}

export async function unpublishArticleAction(id: string): Promise<void> {
  await requirePermission('articles.publish');
  const meta = await getArticleSlugCategoryById(id);
  if (!meta) throw new Error('Not found');
  await requireStatusTransitions([meta], 'draft');
  await unpublishArticleRecord(id);
  revalidatePath('/admin/dashboard');
  revalidateArticlePaths(meta.slug, meta.category);
}

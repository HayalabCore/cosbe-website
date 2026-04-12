'use server';

import { revalidatePath } from 'next/cache';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  archiveArticleRecord,
  countArticles,
  createArticleRecord,
  deleteArticleRecord,
  getArticleByIdAdmin,
  getArticleSlugCategoryById,
  getArticles,
  publishArticleRecord,
  unpublishArticleRecord,
  updateArticleRecord,
} from '@/lib/articles';
import type {
  Article,
  ArticleListItem,
  ArticleStatus,
  ContentCategory,
} from '@/types';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

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
  status?: ArticleStatus | 'all';
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
  const statusFilter =
    options.status === 'all' || !options.status ? undefined : options.status;
  const categoryFilter =
    options.category === 'all' || !options.category
      ? undefined
      : options.category;
  const search = options.search?.trim() || undefined;
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(1, options.pageSize));

  const listFilters = {
    status: statusFilter,
    category: categoryFilter,
    search,
  };

  const [items, total, statsTotal, statsPublished, statsDraft, statsArchived] =
    await Promise.all([
      getArticles({ ...listFilters, page, pageSize }, true),
      countArticles(listFilters, true),
      countArticles({}, true),
      countArticles({ status: 'published' }, true),
      countArticles({ status: 'draft' }, true),
      countArticles({ status: 'archived' }, true),
    ]);

  return {
    items,
    total,
    stats: {
      total: statsTotal,
      published: statsPublished,
      draft: statsDraft,
      archived: statsArchived,
    },
  };
}

export async function createArticleAction(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  await requireUser();
  const id = await createArticleRecord(data);
  revalidateArticlePaths(data.slug, data.category);
  return id;
}

export async function updateArticleAction(
  id: string,
  data: Partial<Omit<Article, 'id' | 'createdAt'>>
): Promise<void> {
  await requireUser();
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

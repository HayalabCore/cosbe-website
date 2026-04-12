'use server';

import { revalidatePath } from 'next/cache';
import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  archiveArticleRecord,
  createArticleRecord,
  deleteArticleRecord,
  getArticleByIdAdmin,
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

export async function listArticlesAdminAction(options: {
  status?: ArticleStatus | 'all';
  category?: ContentCategory | 'all';
}): Promise<ArticleListItem[]> {
  await requireUser();
  const opts =
    options.status === 'all' || !options.status
      ? options.category === 'all' || !options.category
        ? {}
        : { category: options.category }
      : options.category === 'all' || !options.category
        ? { status: options.status }
        : { status: options.status, category: options.category };
  return getArticles(opts, true);
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
  await updateArticleRecord(id, { status: 'draft' });
  revalidatePath('/admin/dashboard');
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
  await publishArticleRecord(id);
  revalidatePath('/admin/dashboard');
}

export async function unpublishArticleAction(id: string): Promise<void> {
  await requireUser();
  await unpublishArticleRecord(id);
  revalidatePath('/admin/dashboard');
}

'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  createArticleRecord,
  deleteArticleRecord,
  getArticleByIdAdmin,
  getArticles,
  publishArticleRecord,
  unpublishArticleRecord,
  updateArticleRecord,
} from '@/lib/articles';
import { articleDetailBasePath } from '@/lib/articlePaths';
import type {
  Article,
  ArticleListItem,
  ArticleStatus,
  ContentCategory,
} from '@/types';
import { routing } from '@/i18n/routing';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

function revalidateArticlePaths(slug?: string, category?: ContentCategory) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/useful-column`, 'layout');
    revalidatePath(`/${locale}/case-studies`, 'layout');
    revalidatePath(`/${locale}/useful-video`, 'layout');
    revalidatePath(`/${locale}/notice`, 'layout');
    if (slug && category) {
      const base = articleDetailBasePath(category);
      revalidatePath(`/${locale}${base}/${slug}`, 'page');
    }
  }
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

export async function deleteArticleAction(id: string): Promise<void> {
  await requireUser();
  await deleteArticleRecord(id);
  revalidateArticlePaths();
}

export async function publishArticleAction(id: string): Promise<void> {
  await requireUser();
  await publishArticleRecord(id);
  revalidateArticlePaths();
}

export async function unpublishArticleAction(id: string): Promise<void> {
  await requireUser();
  await unpublishArticleRecord(id);
  revalidateArticlePaths();
}

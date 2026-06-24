'use server';

import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createArticleRecord } from '@/lib/articles';
import { previewImport, isImportSlugAvailable } from '@/lib/legacy-import';
import { rehostImportImages } from '@/lib/legacy-import/rehost';
import {
  ImageRehostError,
  SlugCollisionError,
  type ImportCommitPayload,
  type ImportPreviewPayload,
} from '@/lib/legacy-import/types';
import { generateTOC } from '@/lib/article-utils';
import { requireUser } from '@/lib/require-user';

export async function previewImportAction(
  url: string
): Promise<ImportPreviewPayload> {
  await requireUser();
  return previewImport(url);
}

export async function checkImportSlugAction(slug: string): Promise<boolean> {
  await requireUser();
  return isImportSlugAvailable(slug);
}

export async function commitImportAction(
  payload: ImportCommitPayload
): Promise<{ id: string; warnings: string[] }> {
  const { supabase } = await requireUser();

  if (!(await isImportSlugAvailable(payload.slug.trim()))) {
    throw new SlugCollisionError(payload.slug);
  }

  let featuredImageUrl: string | null = null;
  let blocks = payload.blocks;
  let rehostWarnings: string[] = [];

  try {
    const rehosted = await rehostImportImages(
      supabase,
      payload.featuredImageRemoteUrl,
      payload.blocks
    );
    featuredImageUrl = rehosted.featuredImageUrl;
    blocks = rehosted.blocks;
    rehostWarnings = rehosted.warnings;
  } catch (e) {
    if (e instanceof ImageRehostError) {
      throw new Error(e.message);
    }
    throw e;
  }

  const id = await createArticleRecord({
    slug: payload.slug.trim(),
    title: payload.title.trim() || 'Untitled',
    excerpt: payload.excerpt.trim() || undefined,
    featuredImage: featuredImageUrl || undefined,
    status: 'draft',
    category: payload.category,
    tags: payload.tags,
    author: {
      id: 'legacy-import',
      name: 'Kenjiro Momi',
      designation: '代表取締役社長',
    },
    blocks,
    toc: generateTOC(blocks),
    seo: {
      metaTitle: payload.title.trim(),
      metaDescription: payload.excerpt.trim() || undefined,
      ogImage: featuredImageUrl || undefined,
    },
    relatedArticleIds: [],
    publishedAt: payload.publishedAt,
    viewCount: 0,
    caseStudy:
      payload.category === 'case-study' ? payload.caseStudyMeta : undefined,
  });

  revalidateArticlePaths(payload.slug, payload.category);

  return { id, warnings: [...payload.warnings, ...rehostWarnings] };
}

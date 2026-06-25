import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import { ARTICLES_CACHE_TAG, articleSlugCacheTag } from '@/lib/articles-cache';
import { articleDetailBasePath } from '@/lib/article-paths';
import { routing } from '@/i18n/routing';
import type { ContentCategory } from '@/types';

const CATEGORY_LISTING_PATH: Record<ContentCategory, string> = {
  'useful-info': '/useful-column',
  'case-study': '/case-studies',
  video: '/useful-video',
  notice: '/notice',
};

/** Revalidates listing layouts and optional article detail page (same as admin article actions). */
export function revalidateArticlePaths(
  slug?: string,
  category?: ContentCategory
) {
  revalidateTag(ARTICLES_CACHE_TAG, 'default');
  if (slug) {
    revalidateTag(articleSlugCacheTag(slug), 'default');
  }

  const listingPaths = category
    ? [CATEGORY_LISTING_PATH[category]]
    : Object.values(CATEGORY_LISTING_PATH);

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`, 'page');

    for (const path of listingPaths) {
      revalidatePath(`/${locale}${path}`, 'layout');
    }
    if (slug && category) {
      const base = articleDetailBasePath(category);
      revalidatePath(`/${locale}${base}/${slug}`, 'page');
    }
  }
}

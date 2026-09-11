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

function slugList(slug?: string | readonly string[]): string[] {
  if (!slug) return [];
  return (typeof slug === 'string' ? [slug] : [...slug]).filter(Boolean);
}

/** Revalidates listing layouts and optional article detail page (same as admin article actions). */
export function revalidateArticlePaths(
  slug?: string | readonly string[],
  category?: ContentCategory
) {
  const slugs = slugList(slug);
  revalidateTag(ARTICLES_CACHE_TAG, 'default');
  for (const s of slugs) {
    revalidateTag(articleSlugCacheTag(s), 'default');
  }

  const listingPaths = category
    ? [CATEGORY_LISTING_PATH[category]]
    : Object.values(CATEGORY_LISTING_PATH);

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`, 'page');

    for (const path of listingPaths) {
      revalidatePath(`/${locale}${path}`, 'layout');
    }
    if (category) {
      const base = articleDetailBasePath(category);
      for (const s of slugs) {
        revalidatePath(`/${locale}${base}/${s}`, 'page');
      }
    }
  }
}

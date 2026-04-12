import 'server-only';

import { revalidatePath } from 'next/cache';
import { articleDetailBasePath } from '@/lib/articlePaths';
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
  const listingPaths = category
    ? [CATEGORY_LISTING_PATH[category]]
    : Object.values(CATEGORY_LISTING_PATH);

  for (const locale of routing.locales) {
    for (const path of listingPaths) {
      revalidatePath(`/${locale}${path}`, 'layout');
    }
    if (slug && category) {
      const base = articleDetailBasePath(category);
      revalidatePath(`/${locale}${base}/${slug}`, 'page');
    }
  }
}

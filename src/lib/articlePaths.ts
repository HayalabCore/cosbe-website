import type { ContentCategory } from '@/types';

/** Path segment after locale (Link from next-intl prepends /en or /ja). */
export function articleDetailBasePath(category: ContentCategory): string {
  switch (category) {
    case 'useful-info':
      return '/useful-column';
    case 'case-study':
      return '/case-studies/details';
    case 'video':
      return '/useful-video';
    case 'notice':
      return '/notice';
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function articleDetailHref(category: ContentCategory, slug: string): string {
  return `${articleDetailBasePath(category)}/${slug}`;
}

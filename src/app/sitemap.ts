import type { MetadataRoute } from 'next';
import { getArticles } from '@/lib/articles';
import { articleDetailBasePath } from '@/lib/article-paths';
import type { ContentCategory } from '@/types';

export const revalidate = 3600; // regenerate at most once per hour

const BASE_URL = 'https://cosbe.inc';
const LOCALES = ['en', 'ja'] as const;

// Static routes that exist under every locale
const STATIC_PATHS = [
  '',
  '/about-ait',
  '/company',
  '/contact',
  '/recruit',
  '/ai-lab',
  '/ai-agent',
  '/ai-transformation',
  '/privacy-policy',
  '/download',
  '/useful-column',
  '/useful-video',
  '/notice',
  '/case-studies',
];

const ARTICLE_CATEGORIES: ContentCategory[] = [
  'useful-info',
  'case-study',
  'video',
  'notice',
];

function alternates(path: string): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, `${BASE_URL}/${locale}${path}`])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}/en${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1.0 : 0.8,
    alternates: { languages: alternates(path) },
  }));

  const articles = await Promise.all(
    ARTICLE_CATEGORIES.map((category) => getArticles({ category }))
  );

  const articleEntries: MetadataRoute.Sitemap = articles
    .flat()
    .map((article) => {
      const path = `${articleDetailBasePath(article.category)}/${article.slug}`;
      return {
        url: `${BASE_URL}/en${path}`,
        lastModified: article.publishedAt
          ? new Date(article.publishedAt)
          : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        alternates: { languages: alternates(path) },
      };
    });

  return [...staticEntries, ...articleEntries];
}

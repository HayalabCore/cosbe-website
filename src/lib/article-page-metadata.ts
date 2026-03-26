import type { Metadata } from 'next';
import type { Article } from '@/types';
import {
  resolveArticleExcerpt,
  resolveArticleTitle,
} from '@/lib/article-locale';

export function buildArticlePageMetadata(
  article: Article,
  locale: string
): Metadata {
  const title = resolveArticleTitle(article, locale);
  const description =
    article.seo?.metaDescription?.trim() ||
    resolveArticleExcerpt(article, locale) ||
    article.excerpt;
  return {
    title: article.seo?.metaTitle || title,
    description: description ?? undefined,
    openGraph: article.seo?.ogImage
      ? { images: [article.seo.ogImage] }
      : undefined,
  };
}

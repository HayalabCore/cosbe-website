import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArticleDetailLayout } from '@/components';
import { generateTOC, generateTOCForLocale } from '@/lib/article-utils';
import { resolveArticleTitle } from '@/lib/article-locale';
import { buildArticlePageMetadata } from '@/lib/article-page-metadata';
import { after } from 'next/server';
import {
  getArticleBySlug,
  getRelatedArticles,
  logArticleView,
} from '@/lib/articles';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Article' };
  return buildArticlePageMetadata(article, locale);
}

export default async function UsefulColumnArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations('articlePage');

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  // Log the view after the response is sent — decoupled from render time
  after(() => logArticleView(article.id).catch(() => {}));

  const toc =
    locale === 'en'
      ? generateTOCForLocale(article.blocks, locale)
      : article.toc?.length
        ? article.toc
        : generateTOC(article.blocks);
  const relatedArticles = await getRelatedArticles(
    article.id,
    article.relatedArticleIds || []
  );

  return (
    <ArticleDetailLayout
      article={article}
      toc={toc}
      locale={locale}
      homeLabel={t('breadcrumb.home')}
      breadcrumbItems={[
        { label: t('breadcrumb.usefulColumn'), href: '/useful-column' },
        { label: resolveArticleTitle(article, locale) },
      ]}
      categoryBadgeLabel={t('category')}
      tableOfContentsTitle={t('tableOfContents')}
      writtenByLabel={t('writtenBy')}
      relatedArticlesTitle={t('relatedArticles')}
      relatedArticles={relatedArticles}
      cta={{
        title: t('cta.title'),
        description1: t('cta.description1'),
        description2: t('cta.description2'),
        button: t('cta.button'),
      }}
    />
  );
}

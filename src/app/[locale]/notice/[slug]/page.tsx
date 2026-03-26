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
  if (!article) return { title: 'Notice' };
  return buildArticlePageMetadata(article, locale);
}

export default async function NoticeArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const pageT = await getTranslations('noticePage');
  const articleT = await getTranslations('articlePage');

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

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
      homeLabel={pageT('breadcrumb.home')}
      breadcrumbItems={[
        { label: pageT('breadcrumb.notice'), href: '/notice' },
        { label: resolveArticleTitle(article, locale) },
      ]}
      categoryBadgeLabel={pageT('category')}
      tableOfContentsTitle={articleT('tableOfContents')}
      writtenByLabel={articleT('writtenBy')}
      relatedArticlesTitle={articleT('relatedArticles')}
      relatedArticles={relatedArticles}
      cta={{
        title: articleT('cta.title'),
        description1: articleT('cta.description1'),
        description2: articleT('cta.description2'),
        button: articleT('cta.button'),
      }}
    />
  );
}

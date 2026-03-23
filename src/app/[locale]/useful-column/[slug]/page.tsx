import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArticleDetailLayout } from '@/components';
import { generateTOC } from '@/lib/article-utils';
import {
  getArticleBySlug,
  getRelatedArticles,
  incrementViewCount,
} from '@/lib/articles';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Article' };
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
    openGraph: article.seo?.ogImage
      ? { images: [article.seo.ogImage] }
      : undefined,
  };
}

export default async function UsefulColumnArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations('articlePage');

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  try {
    await incrementViewCount(article.id);
  } catch {
    /* RPC optional */
  }

  const toc = article.toc?.length ? article.toc : generateTOC(article.blocks);
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
        { label: article.title },
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

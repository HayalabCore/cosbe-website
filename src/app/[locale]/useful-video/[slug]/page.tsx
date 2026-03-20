import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArticleDetailLayout } from '@/components';
import { generateTOC } from '@/lib/article-utils';
import { getArticleBySlug, getRelatedArticles, incrementViewCount } from '@/lib/articles';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Video' };
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
  };
}

export default async function UsefulVideoArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const pageT = await getTranslations('usefulVideoPage');
  const articleT = await getTranslations('articlePage');

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  try {
    await incrementViewCount(article.id);
  } catch {
    /* optional */
  }

  const toc = article.toc?.length ? article.toc : generateTOC(article.blocks);
  const relatedArticles = await getRelatedArticles(article.id, article.relatedArticleIds || []);

  return (
    <ArticleDetailLayout
      article={article}
      toc={toc}
      locale={locale}
      homeLabel={pageT('breadcrumb.home')}
      breadcrumbItems={[
        { label: pageT('breadcrumb.usefulVideo'), href: '/useful-video' },
        { label: article.title },
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

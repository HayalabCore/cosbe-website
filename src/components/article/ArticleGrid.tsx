import 'server-only';
import { Suspense } from 'react';
import { getArticles } from '@/lib/articles';
import ContentCardGrid from './ContentCardGrid';
import ArticleCardGridSkeleton from './ArticleCardGridSkeleton';
import type { ContentCategory } from '@/types';

interface ArticleGridProps {
  category: ContentCategory;
  detailBasePath: string;
  locale: string;
  categoryLabel?: string;
  emptyMessage?: string;
  columns?: '2' | '3';
  fallbackImage?: string;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function ArticleGridInner(props: ArticleGridProps) {
  const {
    category,
    detailBasePath,
    locale,
    categoryLabel,
    emptyMessage,
    columns = '3',
    fallbackImage,
  } = props;
  let items: Awaited<ReturnType<typeof getArticles>> = [];
  try {
    items = await getArticles({ category });
  } catch (e) {
    console.error(`[ArticleGrid] Failed to fetch "${category}":`, e);
  }
  return (
    <ContentCardGrid
      items={items}
      detailBasePath={detailBasePath}
      categoryLabel={categoryLabel}
      columns={columns}
      fallbackImage={fallbackImage}
      formatDate={(iso) => formatDate(iso, locale)}
      emptyMessage={emptyMessage}
    />
  );
}

/**
 * Drop-in streaming article grid. Wraps its own Suspense so callers only
 * need one import — no manual <Suspense> boilerplate in every page.
 */
export default function ArticleGrid(props: ArticleGridProps) {
  return (
    <Suspense
      fallback={<ArticleCardGridSkeleton columns={props.columns ?? '3'} />}
    >
      <ArticleGridInner {...props} />
    </Suspense>
  );
}

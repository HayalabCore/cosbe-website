import 'server-only';
import { Suspense } from 'react';
import { getArticles, countArticles } from '@/lib/articles';
import ContentCardGrid from './ContentCardGrid';
import ArticleCardGridSkeleton from './ArticleCardGridSkeleton';
import ArticlePagination from './ArticlePagination';
import type { ContentCategory } from '@/types';

const PAGE_SIZE = 12;

interface ArticleGridProps {
  category: ContentCategory;
  detailBasePath: string;
  locale: string;
  categoryLabel?: string;
  emptyMessage?: string;
  columns?: '2' | '3';
  fallbackImage?: string;
  page?: number;
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
    page = 1,
  } = props;

  let items: Awaited<ReturnType<typeof getArticles>> = [];
  let total = 0;
  try {
    [items, total] = await Promise.all([
      getArticles({ category, page, pageSize: PAGE_SIZE }),
      countArticles({ category }),
    ]);
  } catch (e) {
    console.error(`[ArticleGrid] Failed to fetch "${category}":`, e);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <ContentCardGrid
        items={items}
        locale={locale}
        detailBasePath={detailBasePath}
        categoryLabel={categoryLabel}
        columns={columns}
        fallbackImage={fallbackImage}
        formatDate={(iso) => formatDate(iso, locale)}
        emptyMessage={emptyMessage}
      />
      {totalPages > 1 && (
        <ArticlePagination
          currentPage={page}
          totalPages={totalPages}
          locale={locale}
        />
      )}
    </>
  );
}

/**
 * Drop-in streaming article grid with built-in pagination.
 * Pass `page` (1-based) from the URL search param.
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

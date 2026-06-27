import {
  countArticles,
  getArticles,
  getArticleStatusCounts,
} from '@/lib/articles-repository';
import { parseStatusesParam } from '@/lib/admin/dashboard-params';
import DashboardClient from './DashboardClient';
import type { ContentCategory } from '@/types';

const PAGE_SIZE = 20;

const VALID_CATEGORIES: ContentCategory[] = [
  'useful-info',
  'case-study',
  'video',
  'notice',
];

function parseCategoryParam(
  v: string | undefined
): ContentCategory | undefined {
  if (!v || v === 'all') return undefined;
  return VALID_CATEGORIES.includes(v as ContentCategory)
    ? (v as ContentCategory)
    : undefined;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const first = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

  const statuses = parseStatusesParam(first(sp.status) ?? null);
  const category = parseCategoryParam(first(sp.category));
  const search = (first(sp.q) ?? '').trim() || undefined;
  const page = Math.max(1, parseInt(first(sp.page) ?? '1', 10) || 1);

  const listFilters = { statuses, category, search };

  const [items, total, stats] = await Promise.all([
    getArticles({ ...listFilters, page, pageSize: PAGE_SIZE }, true),
    countArticles(listFilters, true),
    getArticleStatusCounts(),
  ]);

  return (
    <DashboardClient
      items={items}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      statuses={statuses}
      category={category ?? 'all'}
      search={first(sp.q) ?? ''}
      stats={stats}
    />
  );
}

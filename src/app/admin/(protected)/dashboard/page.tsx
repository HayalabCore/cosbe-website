'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  deleteArticleAction,
  listArticlesAdminAction,
  publishArticleAction,
  unpublishArticleAction,
} from '@/actions/articles';
import type { ArticleListItem, ArticleStatus, ContentCategory } from '@/types';

const CATEGORY_CLS: Record<string, string> = {
  'useful-info': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'case-study': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  video: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  notice: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const STATUS_STYLE: Record<string, { dot: string; cls: string }> = {
  published: {
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  draft: {
    dot: 'bg-amber-400',
    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  archived: {
    dot: 'bg-slate-400',
    cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
          {value}
        </p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  const [allItems, setAllItems] = useState<ArticleListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>(
    'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory | 'all'>(
    'all'
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listArticlesAdminAction({});
      setAllItems(rows);
    } catch (e) {
      console.error(e);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: allItems.length,
      published: allItems.filter((i) => i.status === 'published').length,
      draft: allItems.filter((i) => i.status === 'draft').length,
      archived: allItems.filter((i) => i.status === 'archived').length,
    }),
    [allItems]
  );

  const displayItems = useMemo(() => {
    return allItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter)
        return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [allItems, statusFilter, categoryFilter, search]);

  const categoryLabel = useCallback(
    (k: string) => {
      if (k === 'useful-info') return t('categoryUsefulInfo');
      if (k === 'case-study') return t('categoryCaseStudy');
      if (k === 'video') return t('categoryVideo');
      if (k === 'notice') return t('categoryNotice');
      return k;
    },
    [t]
  );

  const statusLabel = useCallback(
    (k: string) => {
      if (k === 'published') return t('statusPublished');
      if (k === 'draft') return t('statusDraft');
      if (k === 'archived') return t('statusArchived');
      return k;
    },
    [t]
  );

  async function handleDelete(id: string, title: string) {
    if (!confirm(t('deleteConfirm', { title }))) return;
    await deleteArticleAction(id);
    void load();
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('newPost')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('totalPosts')}
          value={stats.total}
          color="bg-slate-100"
          icon={
            <svg
              className="w-5 h-5 text-slate-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          label={t('published')}
          value={stats.published}
          color="bg-emerald-50"
          icon={
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label={t('drafts')}
          value={stats.draft}
          color="bg-amber-50"
          icon={
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          }
        />
        <StatCard
          label={t('archived')}
          value={stats.archived}
          color="bg-slate-100"
          icon={
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          }
        />
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ArticleStatus | 'all')
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 shadow-sm"
        >
          <option value="all">{t('filterStatusAll')}</option>
          <option value="draft">{t('filterStatusDraft')}</option>
          <option value="published">{t('filterStatusPublished')}</option>
          <option value="archived">{t('filterStatusArchived')}</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as ContentCategory | 'all')
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 shadow-sm"
        >
          <option value="all">{t('filterCategoryAll')}</option>
          <option value="useful-info">{t('categoryUsefulInfo')}</option>
          <option value="case-study">{t('categoryCaseStudy')}</option>
          <option value="video">{t('categoryVideo')}</option>
          <option value="notice">{t('categoryNotice')}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg
            className="animate-spin w-6 h-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-700 mb-1">
                {t('noPostsTitle')}
              </p>
              <p className="text-sm text-slate-400">
                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? t('noPostsFiltered')
                  : t('noPostsEmpty')}
              </p>
              {!search &&
                statusFilter === 'all' &&
                categoryFilter === 'all' && (
                  <Link
                    href="/admin/posts/new"
                    className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    {t('createFirstPost')}
                  </Link>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('tableTitle')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">
                      {t('tableCategory')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('tableStatus')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">
                      {t('tablePublished')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('tableActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.map((row) => {
                    const catCls =
                      CATEGORY_CLS[row.category] ??
                      'bg-slate-100 text-slate-600';
                    const st =
                      STATUS_STYLE[row.status ?? ''] ?? STATUS_STYLE.draft;
                    const publishedDate = row.publishedAt
                      ? new Date(row.publishedAt).toLocaleDateString(
                          dateLocale,
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )
                      : null;
                    return (
                      <tr
                        key={row.id}
                        className="group hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-primaryColor transition-colors line-clamp-1">
                              {row.title}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">
                              {row.slug}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${catCls}`}
                          >
                            {categoryLabel(row.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${st.cls}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                            />
                            {statusLabel(row.status ?? '')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-sm text-slate-400">
                            {publishedDate ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit */}
                            <Link
                              href={`/admin/posts/${row.id}`}
                              title={t('editTitle')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primaryColor hover:bg-primaryColor/8 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.75}
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Link>

                            {/* Publish / Unpublish */}
                            {row.status === 'published' ? (
                              <button
                                type="button"
                                title={t('unpublishTitle')}
                                onClick={() =>
                                  void unpublishArticleAction(row.id).then(load)
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.75}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="button"
                                title={t('publishTitle')}
                                onClick={() =>
                                  void publishArticleAction(row.id).then(load)
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.75}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              title={t('deleteTitle')}
                              onClick={() =>
                                void handleDelete(row.id, row.title)
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.75}
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && displayItems.length > 0 && (
        <p className="text-xs text-slate-400 mt-3 text-right">
          {t('showing', { shown: displayItems.length, total: allItems.length })}
        </p>
      )}
    </div>
  );
}

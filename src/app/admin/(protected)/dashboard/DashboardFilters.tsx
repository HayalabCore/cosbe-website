'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DASHBOARD_STATUSES,
  serializeStatuses,
} from '@/lib/admin/dashboard-params';
import type { ArticleStatus, ContentCategory } from '@/types';

const STATUS_BADGE: Record<ArticleStatus, { on: string; off: string }> = {
  draft: {
    on: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
    off: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
  },
  published: {
    on: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
    off: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
  },
  archived: {
    on: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
    off: 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
  },
};

type Props = {
  search: string;
  statuses: ArticleStatus[];
  category: ContentCategory | 'all';
  isPending: boolean;
  stats: { total: number; published: number; draft: number; archived: number };
  onNavigate: (updates: Record<string, string | null>) => void;
};

export default function DashboardFilters({
  search,
  statuses,
  category,
  isPending,
  stats,
  onNavigate,
}: Props) {
  const t = useTranslations('admin.dashboard');
  const [searchInput, setSearchInput] = useState(search);

  // Keep the input in sync if the URL changes externally (back/forward, reset).
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounced search → URL.
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput.trim() === search.trim()) return;
      onNavigate({ q: searchInput.trim() || null, page: '1' });
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput, search, onNavigate]);

  const statusLabel = (s: ArticleStatus) =>
    s === 'published'
      ? t('statusPublished')
      : s === 'draft'
        ? t('statusDraft')
        : t('statusArchived');

  function toggleStatus(s: ArticleStatus) {
    const next = statuses.includes(s)
      ? statuses.filter((x) => x !== s)
      : [...statuses, s];
    onNavigate({ status: serializeStatuses(next), page: '1' });
  }

  return (
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all shadow-sm"
        />
      </div>

      <div className="flex items-center gap-1.5" aria-busy={isPending}>
        <button
          type="button"
          onClick={() => onNavigate({ status: null, page: '1' })}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            statuses.length === 0
              ? 'bg-primaryColor text-white'
              : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {t('filterStatusAll')}
          <span className="tabular-nums opacity-70">{stats.total}</span>
        </button>
        {DASHBOARD_STATUSES.map((s) => {
          const active = statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStatus(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? STATUS_BADGE[s].on : STATUS_BADGE[s].off
              }`}
            >
              {statusLabel(s)}
              <span className="tabular-nums opacity-70">{stats[s]}</span>
            </button>
          );
        })}
      </div>

      <select
        value={category}
        onChange={(e) =>
          onNavigate({
            category: e.target.value === 'all' ? null : e.target.value,
            page: '1',
          })
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
  );
}

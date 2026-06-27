'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ArticleListItem } from '@/types';

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

function sourcePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export default function RecentImports({ items }: { items: ArticleListItem[] }) {
  const t = useTranslations('admin.bulkImport');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          {t('recentTitle')}
        </h2>
        <Link
          href="/admin/dashboard"
          className="text-xs font-semibold text-primaryColor hover:text-primaryHover"
        >
          {t('viewAll')} →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          {t('recentEmpty')}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {items.map((a) => {
            const st = STATUS_STYLE[a.status ?? ''] ?? STATUS_STYLE.draft;
            const date = a.createdAt
              ? new Date(a.createdAt).toLocaleDateString(dateLocale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/posts/${a.id}`}
                    className="block max-w-full truncate text-sm font-medium text-slate-900 hover:text-primaryColor transition-colors"
                  >
                    {a.title}
                  </Link>
                  {a.sourceUrl && (
                    <a
                      href={a.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={a.sourceUrl}
                      className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[11px] text-slate-400 hover:text-primaryColor transition-colors"
                    >
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      <span className="truncate font-mono">
                        {sourcePath(a.sourceUrl)}
                      </span>
                    </a>
                  )}
                </div>
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${st.cls}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {a.status}
                </span>
                {date && (
                  <span className="hidden md:block text-xs text-slate-400 whitespace-nowrap">
                    {date}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { Link, usePathname } from '@/i18n/routing';

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function ArticlePagination({ currentPage, totalPages }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  // Locale-stripped path of the current listing page (e.g. "/notice").
  // next-intl's <Link> re-adds the locale prefix. Without an explicit pathname
  // the href object resolves to `/${locale}undefined` (e.g. "/enundefined").
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center gap-1 mt-12">
      {currentPage > 1 && (
        <Link
          href={{ pathname, query: { page: currentPage - 1 } }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ←
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={p === 1 ? { pathname } : { pathname, query: { page: p } }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            p === currentPage
              ? 'bg-primaryColor text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={{ pathname, query: { page: currentPage + 1 } }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          →
        </Link>
      )}
    </div>
  );
}

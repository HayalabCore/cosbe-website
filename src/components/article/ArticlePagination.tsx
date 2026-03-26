import { Link } from '@/i18n/routing';

interface Props {
  currentPage: number;
  totalPages: number;
  locale: string;
}

export default function ArticlePagination({ currentPage, totalPages }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 mt-12">
      {currentPage > 1 && (
        <Link
          href={{ query: { page: currentPage - 1 } }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ←
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={p === 1 ? {} : { query: { page: p } }}
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
          href={{ query: { page: currentPage + 1 } }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          →
        </Link>
      )}
    </div>
  );
}

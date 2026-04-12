/**
 * Table-shaped loading placeholder for the admin posts list (matches real column layout).
 */
export default function AdminArticleTableSkeleton({
  rows = 8,
  'aria-label': ariaLabel,
}: {
  rows?: number;
  'aria-label'?: string;
}) {
  const n = Math.max(1, Math.min(rows, 24));

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-pulse"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left">
                <div className="h-3 bg-slate-200 rounded w-24" />
              </th>
              <th className="px-4 py-3 text-left hidden md:table-cell">
                <div className="h-3 bg-slate-200 rounded w-20" />
              </th>
              <th className="px-4 py-3 text-left">
                <div className="h-3 bg-slate-200 rounded w-16" />
              </th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">
                <div className="h-3 bg-slate-200 rounded w-20" />
              </th>
              <th className="px-4 py-3 text-right">
                <div className="h-3 bg-slate-200 rounded w-14 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: n }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3.5">
                  <div className="space-y-2 max-w-md">
                    <div className="h-4 bg-slate-200 rounded w-[85%]" />
                    <div className="h-3 bg-slate-100 rounded w-[45%]" />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <div className="h-6 bg-slate-100 rounded-md w-24" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="h-6 bg-slate-100 rounded-md w-20" />
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <div className="h-4 bg-slate-100 rounded w-28" />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-1">
                    <div className="h-7 w-7 rounded-lg bg-slate-100" />
                    <div className="h-7 w-7 rounded-lg bg-slate-100" />
                    <div className="h-7 w-7 rounded-lg bg-slate-100" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

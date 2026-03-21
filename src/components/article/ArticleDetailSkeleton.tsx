export default function ArticleDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white pt-20 animate-pulse">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-4 w-56 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 border-r border-gray-200 pr-5 space-y-1">
              <div className="h-3 w-8 bg-slate-200 rounded" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-7 bg-slate-200 rounded w-5/6" />
              <div className="h-7 bg-slate-200 rounded w-4/6" />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pl-20">
            <div className="h-6 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-10">
          {/* Body */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="aspect-video rounded-xl bg-slate-200 mb-10" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-11/12" />
                <div className="h-4 bg-slate-100 rounded w-4/5" />
              </div>
            ))}
          </div>

          {/* TOC sidebar */}
          <aside className="hidden lg:block lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <div className="rounded-xl border border-gray-100 p-5 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-slate-100 rounded"
                  style={{ width: `${70 + (i % 3) * 10}%` }}
                />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

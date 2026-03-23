export default function ArticleCardGridSkeleton({
  columns = '3',
}: {
  columns?: '2' | '3';
}) {
  const gridClass =
    columns === '2' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3';
  const count = columns === '2' ? 4 : 6;
  return (
    <div className={`grid ${gridClass} gap-6 animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 overflow-hidden shadow-sm bg-white"
        >
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-11/12" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="h-3 bg-slate-100 rounded w-24" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200" />
                <div className="h-3 bg-slate-100 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

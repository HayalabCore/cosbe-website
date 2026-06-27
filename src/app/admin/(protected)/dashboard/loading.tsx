import AdminArticleTableSkeleton from '@/components/admin/AdminArticleTableSkeleton';

export default function DashboardLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="h-7 w-40 bg-slate-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5 h-[88px] animate-pulse"
          />
        ))}
      </div>
      <AdminArticleTableSkeleton rows={10} />
    </div>
  );
}

import { AdminPageHeaderSkeleton } from '@/components/admin/AdminSkeletons';

export default function AdminProtectedLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminPageHeaderSkeleton aria-label="Loading…" />
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

import {
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
} from '@/components/admin/AdminSkeletons';

export default function UsersLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminPageHeaderSkeleton aria-label="Loading…" />
      <AdminTableSkeleton rows={8} columns={6} />
    </div>
  );
}

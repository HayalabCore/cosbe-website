import {
  AdminCardGridSkeleton,
  AdminPageHeaderSkeleton,
} from '@/components/admin/AdminSkeletons';

export default function RolesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeaderSkeleton aria-label="Loading…" />
      <AdminCardGridSkeleton cards={4} />
    </div>
  );
}

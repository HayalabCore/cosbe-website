import {
  AdminMediaGridSkeleton,
  AdminPageHeaderSkeleton,
} from '@/components/admin/AdminSkeletons';

export default function MediaLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminPageHeaderSkeleton aria-label="Loading…" />
      <AdminMediaGridSkeleton tiles={8} />
    </div>
  );
}

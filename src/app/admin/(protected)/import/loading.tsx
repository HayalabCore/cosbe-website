import { AdminImportSkeleton } from '@/components/admin/AdminSkeletons';

export default function ImportLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AdminImportSkeleton aria-label="Loading…" />
    </div>
  );
}

import { AdminTranslationsSkeleton } from '@/components/admin/AdminSkeletons';

export default function TranslationsLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <AdminTranslationsSkeleton aria-label="Loading…" />
      </div>
    </div>
  );
}

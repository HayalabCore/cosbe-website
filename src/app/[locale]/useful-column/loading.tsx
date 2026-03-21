import { ArticleCardGridSkeleton } from '@/components';

export default function UsefulColumnLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="relative min-h-[280px] md:min-h-[320px] bg-primaryColor/30" />
      <div className="border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
        <div className="h-4 w-48 bg-slate-200 rounded" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ArticleCardGridSkeleton columns="3" />
      </div>
    </div>
  );
}

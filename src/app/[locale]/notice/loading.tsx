import { ArticleCardGridSkeleton } from '@/components';

export default function NoticeLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="relative min-h-[240px] md:min-h-[280px] bg-primaryColor/30" />
      <div className="border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 max-w-6xl mx-auto">
        <div className="h-4 w-48 bg-slate-200 rounded" />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <ArticleCardGridSkeleton columns="3" />
      </div>
    </div>
  );
}

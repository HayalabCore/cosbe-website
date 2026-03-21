import { ArticleCardGridSkeleton } from '@/components';

export default function CaseStudiesLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="relative min-h-[280px] bg-primaryColor/30" />
      <div className="border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
        <div className="h-4 w-48 bg-slate-200 rounded" />
      </div>
      <div className="bg-bgAccent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ArticleCardGridSkeleton columns="3" />
        </div>
      </div>
    </div>
  );
}

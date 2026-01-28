import { getTranslations } from 'next-intl/server';

export default async function UsefulVideoPage() {
  const t = await getTranslations('usefulVideoPage');

  const videos = [
    {
      id: 1,
      category: t('video1.category'),
      title: t('video1.title'),
      description: t('video1.description'),
      duration: t('video1.duration'),
      views: t('video1.views'),
    },
    {
      id: 2,
      category: t('video2.category'),
      title: t('video2.title'),
      description: t('video2.description'),
      duration: t('video2.duration'),
      views: t('video2.views'),
    },
    {
      id: 3,
      category: t('video3.category'),
      title: t('video3.title'),
      description: t('video3.description'),
      duration: t('video3.duration'),
      views: t('video3.views'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/20 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent mb-4">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-semibold">
            {t('subtitle')}
          </p>
        </div>

        {/* Description */}
        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-lg md:text-xl text-slate-700 text-center leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors">
            {t('categories.all')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.tutorials')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.casestudies')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.webinars')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.demos')}
          </button>
        </div>

        {/* Featured Video */}
        <div className="mb-16">
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl ring-1 ring-blue-100/50 border border-white/20">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-64 md:h-full bg-gradient-to-br from-blue-400 to-blue-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-blue-600">
                    {t('featured.label')}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 bg-black/70 backdrop-blur-sm rounded text-sm text-white">
                    {t('featured.duration')}
                  </span>
                </div>
              </div>
              <div className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                  {t('featured.title')}
                </h2>
                <p className="text-lg text-slate-600 mb-6">
                  {t('featured.description')}
                </p>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {t('featured.views')}
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('featured.duration')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg ring-1 ring-blue-100/50 border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-blue-600">
                    {video.category}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white">
                    {video.duration}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-slate-600 mb-4 line-clamp-2">
                  {video.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {video.views}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subscribe CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('subscribe.title')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('subscribe.description')}
          </p>
          <button className="px-8 py-4 bg-white text-blue-600 rounded-full hover:shadow-lg transition-all duration-200 text-lg font-semibold transform hover:scale-105">
            {t('subscribe.button')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';

export default async function DownloadPage() {
  const t = await getTranslations('downloadPage');

  const materials = [
    {
      id: 1,
      title: t('material1.title'),
      description: t('material1.description'),
      pages: t('material1.pages'),
      format: 'PDF',
      size: '2.5 MB',
    },
    {
      id: 2,
      title: t('material2.title'),
      description: t('material2.description'),
      pages: t('material2.pages'),
      format: 'PDF',
      size: '3.2 MB',
    },
    {
      id: 3,
      title: t('material3.title'),
      description: t('material3.description'),
      pages: t('material3.pages'),
      format: 'PDF',
      size: '1.8 MB',
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
        <div className="max-w-4xl mx-auto mb-20">
          <p className="text-lg md:text-xl text-slate-700 text-center leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Featured Material */}
        <div className="mb-20">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl overflow-hidden shadow-xl">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
              <div className="text-white">
                <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                  {t('featured.label')}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t('featured.title')}
                </h2>
                <p className="text-lg opacity-90 mb-6">
                  {t('featured.description')}
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{t('featured.benefit1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{t('featured.benefit2')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{t('featured.benefit3')}</span>
                  </li>
                </ul>
                <button className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:shadow-lg transition-all">
                  {t('downloadButton')}
                </button>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <svg className="w-32 h-32 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {materials.map((material) => (
            <div
              key={material.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg ring-1 ring-blue-100/50 border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center relative overflow-hidden">
                <svg className="w-24 h-24 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-blue-600">
                    {material.format}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">
                  {material.title}
                </h3>
                <p className="text-slate-600 mb-4 line-clamp-3">
                  {material.description}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {material.pages}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {material.size}
                  </span>
                </div>
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold hover:shadow-lg transition-all">
                  {t('downloadButton')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">
            {t('benefits.title')}
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t('benefits.benefit1.title')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('benefits.benefit1.description')}
              </p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t('benefits.benefit2.title')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('benefits.benefit2.description')}
              </p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t('benefits.benefit3.title')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('benefits.benefit3.description')}
              </p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t('benefits.benefit4.title')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('benefits.benefit4.description')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('cta.subtitle')}
          </p>
          <button className="px-8 py-4 bg-white text-blue-600 rounded-full hover:shadow-lg transition-all duration-200 text-lg font-semibold transform hover:scale-105">
            {t('cta.button')}
          </button>
        </div>
      </div>
    </div>
  );
}

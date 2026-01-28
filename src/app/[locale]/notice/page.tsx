import { getTranslations } from 'next-intl/server';

export default async function NoticePage() {
  const t = await getTranslations('noticePage');

  const notices = [
    {
      id: 1,
      category: t('notice1.category'),
      title: t('notice1.title'),
      excerpt: t('notice1.excerpt'),
      date: t('notice1.date'),
      important: true,
    },
    {
      id: 2,
      category: t('notice2.category'),
      title: t('notice2.title'),
      excerpt: t('notice2.excerpt'),
      date: t('notice2.date'),
      important: false,
    },
    {
      id: 3,
      category: t('notice3.category'),
      title: t('notice3.title'),
      excerpt: t('notice3.excerpt'),
      date: t('notice3.date'),
      important: false,
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
            {t('categories.product')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.company')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.events')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.press')}
          </button>
        </div>

        {/* Notices List */}
        <div className="max-w-4xl mx-auto space-y-6">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`group bg-white rounded-2xl p-6 md:p-8 shadow-lg ring-1 ring-blue-100/50 border border-white/20 hover:shadow-xl transition-all duration-300 ${
                notice.important ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {notice.important && (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase">
                        {t('important')}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                      {notice.category}
                    </span>
                    <span className="text-sm text-slate-500">{notice.date}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                    {notice.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {notice.excerpt}
                  </p>
                </div>
                <button className="px-6 py-2 text-blue-600 font-semibold hover:bg-blue-50 rounded-full transition-colors whitespace-nowrap">
                  {t('readMore')} →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Archive Link */}
        <div className="text-center mt-12">
          <button className="px-8 py-4 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-all border border-gray-200">
            {t('viewArchive')}
          </button>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-20 bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 md:p-12 border border-blue-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              {t('newsletter.title')}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {t('newsletter.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder={t('newsletter.placeholder')}
                className="flex-1 px-6 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold hover:shadow-lg transition-all whitespace-nowrap">
                {t('newsletter.button')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

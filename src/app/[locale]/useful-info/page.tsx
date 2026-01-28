import { getTranslations } from 'next-intl/server';

export default async function UsefulInfoPage() {
  const t = await getTranslations('usefulInfoPage');

  const articles = [
    {
      id: 1,
      category: t('article1.category'),
      title: t('article1.title'),
      excerpt: t('article1.excerpt'),
      date: t('article1.date'),
      readTime: t('article1.readTime'),
    },
    {
      id: 2,
      category: t('article2.category'),
      title: t('article2.title'),
      excerpt: t('article2.excerpt'),
      date: t('article2.date'),
      readTime: t('article2.readTime'),
    },
    {
      id: 3,
      category: t('article3.category'),
      title: t('article3.title'),
      excerpt: t('article3.excerpt'),
      date: t('article3.date'),
      readTime: t('article3.readTime'),
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
            {t('categories.aiBasics')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.implementation')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.trends')}
          </button>
          <button className="px-6 py-3 bg-white text-slate-700 rounded-full font-semibold hover:bg-blue-50 transition-colors border border-gray-200">
            {t('categories.bestPractices')}
          </button>
        </div>

        {/* Featured Article */}
        <div className="mb-16">
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
                  {t('featured.excerpt')}
                </p>
                <button className="px-6 py-3 bg-white text-blue-600 rounded-full font-semibold hover:shadow-lg transition-all">
                  {t('readMore')}
                </button>
              </div>
              <div className="hidden md:block bg-white/10 backdrop-blur-sm rounded-2xl"></div>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {articles.map((article) => (
            <div
              key={article.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg ring-1 ring-blue-100/50 border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 relative">
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-blue-600">
                    {article.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                  <span>{article.date}</span>
                  <span>•</span>
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-slate-600 mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <button className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  {t('readMore')} →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 md:p-12 border border-blue-100">
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

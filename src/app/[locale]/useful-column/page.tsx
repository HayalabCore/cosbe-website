import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export default async function UsefulColumnPage() {
  const t = await getTranslations('usefulColumnPage');

  const articles = [
    {
      id: 1,
      slug: 'ai-agent-autonomous-management',
      image: '/useful-column/article-01.png',
      category: t('articles.article1.category'),
      title: t('articles.article1.title'),
      date: t('articles.article1.date'),
      author: t('articles.article1.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 2,
      slug: 'user-integrated-ai-approach',
      image: '/useful-column/article-02.png',
      category: t('articles.article2.category'),
      title: t('articles.article2.title'),
      date: t('articles.article2.date'),
      author: t('articles.article2.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 3,
      slug: 'small-scale-ai-strategy',
      image: '/useful-column/article-03.png',
      category: t('articles.article3.category'),
      title: t('articles.article3.title'),
      date: t('articles.article3.date'),
      author: t('articles.article3.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 4,
      slug: 'issue-first-thinking',
      image: '/useful-column/article-04.png',
      category: t('articles.article4.category'),
      title: t('articles.article4.title'),
      date: t('articles.article4.date'),
      author: t('articles.article4.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 5,
      slug: 'ai-transformation-4-values',
      image: '/useful-column/article-05.png',
      category: t('articles.article5.category'),
      title: t('articles.article5.title'),
      date: t('articles.article5.date'),
      author: t('articles.article5.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 6,
      slug: 'empiricism-ai-introduction',
      image: '/useful-column/article-06.png',
      category: t('articles.article6.category'),
      title: t('articles.article6.title'),
      date: t('articles.article6.date'),
      author: t('articles.article6.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 7,
      slug: 'ai-gap-sme',
      image: '/useful-column/article-07.png',
      category: t('articles.article7.category'),
      title: t('articles.article7.title'),
      date: t('articles.article7.date'),
      author: t('articles.article7.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 8,
      slug: 'chatgpt-business-transformation',
      image: '/useful-column/article-08.png',
      category: t('articles.article8.category'),
      title: t('articles.article8.title'),
      date: t('articles.article8.date'),
      author: t('articles.article8.author'),
      authorImage: '/useful-column/author-portrait.jpg',
    },
    {
      id: 9,
      slug: 'cosbe-ai-transformation-steps',
      image: '/useful-column/article-09.jpg',
      category: t('articles.article9.category'),
      title: t('articles.article9.title'),
      date: t('articles.article9.date'),
      author: t('articles.article9.author'),
      authorImage: '/useful-column/author-portrait-alt.jpg',
    },
    {
      id: 10,
      slug: 'ai-transformation-success-pitfalls',
      image: '/useful-column/article-10.jpg',
      category: t('articles.article10.category'),
      title: t('articles.article10.title'),
      date: t('articles.article10.date'),
      author: t('articles.article10.author'),
      authorImage: '/useful-column/author-portrait-alt.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div 
        className="relative min-h-[280px] md:min-h-[320px] flex flex-col items-start justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/useful-column/hero-background.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#5FA4E6]/40"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 pt-28">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-[#5FA4E6] flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('breadcrumb.home')}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-800">{t('breadcrumb.usefulColumn')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/useful-column/${article.slug}`}
              className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center px-3 py-1 bg-[#5FA4E6] text-white text-xs font-medium rounded"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 6px, transparent 6px, transparent 12px)'
                    }}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {article.category}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 line-clamp-2 group-hover:text-[#5FA4E6] transition-colors">
                  {article.title}
                </h2>
                
                {/* Meta Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {article.date}
                  </div>
                  
                  {/* Author */}
                  <div className="flex items-center">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2">
                      <Image
                        src={article.authorImage}
                        alt={article.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-600">{article.author}</span>
                  </div>
                </div>
                
                {/* Read More Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[#5FA4E6] text-sm font-medium group-hover:text-[#4A8FD1] transition-colors flex items-center">
                    {t('readMore')}
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-12">
          <nav className="flex items-center gap-2">
            <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium">1</span>
            <Link href="/useful-column?page=2" className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
              2
            </Link>
          </nav>
        </div>
      </div>

      {/* CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 whitespace-pre-line">
            {t('cta.title')}
          </h2>
          <p className="text-white/80 mb-2 text-base">
            {t('cta.description1')}
          </p>
          <p className="text-white/80 mb-10 text-base">
            {t('cta.description2')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-[#5FA4E6] text-white rounded-full font-bold text-lg hover:bg-[#7AB5ED] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

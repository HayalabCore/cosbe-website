import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export default async function NoticePage() {
  const t = await getTranslations('noticePage');

  const notices = [
    {
      id: 1,
      title: t('notice1.title'),
      date: t('notice1.date'),
      author: t('author'),
      image: '/notice/notice-01.jpeg',
    },
    {
      id: 2,
      title: t('notice2.title'),
      date: t('notice2.date'),
      author: t('author'),
      image: '/notice/notice-02.png',
    },
    {
      id: 3,
      title: t('notice3.title'),
      date: t('notice3.date'),
      author: t('author'),
      image: '/notice/notice-03.jpeg',
    },
    {
      id: 4,
      title: t('notice4.title'),
      date: t('notice4.date'),
      author: t('author'),
      image: '/notice/notice-04.png',
    },
    {
      id: 5,
      title: t('notice5.title'),
      date: t('notice5.date'),
      author: t('author'),
      image: '/notice/notice-05.png',
    },
    {
      id: 6,
      title: t('notice6.title'),
      date: t('notice6.date'),
      author: t('author'),
      image: '/notice/notice-06.jpg',
    },
    {
      id: 7,
      title: t('notice7.title'),
      date: t('notice7.date'),
      author: t('author'),
      image: '/notice/notice-07.jpg',
    },
    {
      id: 8,
      title: t('notice8.title'),
      date: t('notice8.date'),
      author: t('author'),
      image: '/notice/notice-08.jpg',
    },
    {
      id: 9,
      title: t('notice9.title'),
      date: t('notice9.date'),
      author: t('author'),
      image: '/notice/notice-09.jpg',
    },
    {
      id: 10,
      title: t('notice10.title'),
      date: t('notice10.date'),
      author: t('author'),
      image: '/notice/notice-10.png',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[240px] md:min-h-[280px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/notice/hero-background.jpeg"
            alt="Notice background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[#5FA4E6]/40" />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl font-medium drop-shadow">
            {t('heroSubtitle')}
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav className="bg-gray-100 py-3 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <ol className="flex items-center text-sm text-gray-600">
            <li className="flex items-center">
              <Link href="/" className="hover:text-[#5FA4E6] transition-colors">
                <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                {t('breadcrumb.home')}
              </Link>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-800 font-medium">{t('breadcrumb.notice')}</span>
            </li>
          </ol>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Notice Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notices.map((notice) => (
            <article
              key={notice.id}
              className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <Link href="/notice" className="block">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={notice.image}
                    alt={notice.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Category Badge */}
                  <span className="absolute top-3 left-3 px-3 py-1 bg-[#5FA4E6] text-white text-xs font-medium rounded">
                    {t('category')}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-[#5FA4E6] transition-colors">
                    {notice.title}
                  </h2>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {notice.date}
                    </div>

                    {/* Author */}
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                        <Image
                          src="/notice/author-portrait.jpg"
                          alt={notice.author}
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      </div>
                      <span className="text-gray-600 text-xs">{notice.author}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-12">
          <span className="w-10 h-10 flex items-center justify-center bg-[#5FA4E6] text-white rounded font-medium">
            1
          </span>
          <Link
            href="/notice"
            className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
          >
            2
          </Link>
        </div>
      </main>

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

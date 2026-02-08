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
      image: '/Notice/file-1024x683.jpeg',
    },
    {
      id: 2,
      title: t('notice2.title'),
      date: t('notice2.date'),
      author: t('author'),
      image: '/Notice/file-1024x576.png',
    },
    {
      id: 3,
      title: t('notice3.title'),
      date: t('notice3.date'),
      author: t('author'),
      image: '/Notice/cover-QRi0RwRzS2fRNAi0BxxDJ8r1dO46cOQ3.jpeg',
    },
    {
      id: 4,
      title: t('notice4.title'),
      date: t('notice4.date'),
      author: t('author'),
      image: '/Notice/e2bf0c7924c3de5c4fd208be249511b1-1024x576.png',
    },
    {
      id: 5,
      title: t('notice5.title'),
      date: t('notice5.date'),
      author: t('author'),
      image: '/Notice/181835915fcbbfa33cf8bec49d78a8cd-1024x576.png',
    },
    {
      id: 6,
      title: t('notice6.title'),
      date: t('notice6.date'),
      author: t('author'),
      image: '/Notice/306ccae5503a964aa65889105b1e8474-1024x576.jpg',
    },
    {
      id: 7,
      title: t('notice7.title'),
      date: t('notice7.date'),
      author: t('author'),
      image: '/Notice/1cd139abcbfde1f7c6744fa33c534a20-1024x576.jpg',
    },
    {
      id: 8,
      title: t('notice8.title'),
      date: t('notice8.date'),
      author: t('author'),
      image: '/Notice/daf8b85ba262b08a7346978140ffed59-1024x576.jpg',
    },
    {
      id: 9,
      title: t('notice9.title'),
      date: t('notice9.date'),
      author: t('author'),
      image: '/Notice/54e3d281699655eda0dd6598e38fd8b1-1024x576.jpg',
    },
    {
      id: 10,
      title: t('notice10.title'),
      date: t('notice10.date'),
      author: t('author'),
      image: '/Notice/4495bed8051fcc9fd4ac4bababda36e3.png',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[240px] md:min-h-[280px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/Notice/AdobeStock_389250400-scaled-e1735225994794.jpeg"
            alt="Notice background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-blue-500/40" />
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
              <Link href="/" className="hover:text-blue-600 transition-colors">
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
                  <span className="absolute top-3 left-3 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                    {t('category')}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
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
                          src="/Notice/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg"
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
          <span className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded font-medium">
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
      <section className="relative py-16 md:py-20">
        <div className="absolute inset-0">
          <Image
            src="/ai-lab/AdobeStock_588248272-1-scaled.jpeg"
            alt="CTA background"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/80" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-gray-300 mb-2">
            {t('cta.description1')}
          </p>
          <p className="text-gray-300 mb-8">
            {t('cta.description2')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

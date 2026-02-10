import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export default async function UsefulVideoPage() {
  const t = await getTranslations('usefulVideoPage');

  const videos = [
    {
      id: 1,
      image: '/useful-video/video-thumbnail-01.jpg',
      title: t('video1.title'),
      date: t('video1.date'),
      author: t('video1.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 2,
      image: '/useful-video/video-thumbnail-02.jpg',
      title: t('video2.title'),
      date: t('video2.date'),
      author: t('video2.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 3,
      image: '/useful-video/video-thumbnail-03.jpg',
      title: t('video3.title'),
      date: t('video3.date'),
      author: t('video3.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 4,
      image: '/useful-video/video-thumbnail-04.jpg',
      title: t('video4.title'),
      date: t('video4.date'),
      author: t('video4.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 5,
      image: '/useful-video/video-thumbnail-05.jpg',
      title: t('video5.title'),
      date: t('video5.date'),
      author: t('video5.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 6,
      image: '/useful-video/video-thumbnail-06.jpg',
      title: t('video6.title'),
      date: t('video6.date'),
      author: t('video6.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 7,
      image: '/useful-video/video-thumbnail-07.jpg',
      title: t('video7.title'),
      date: t('video7.date'),
      author: t('video7.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
    {
      id: 8,
      image: '/useful-video/video-thumbnail-07.jpg',
      title: t('video8.title'),
      date: t('video8.date'),
      author: t('video8.author'),
      authorImage: '/useful-video/author-portrait.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-r from-[#5FA4E6]/80 to-[#5FA4E6]/80 py-16 pt-32">
        <div className="absolute inset-0 bg-[url('/useful-video/video-thumbnail-01.jpg')] bg-cover bg-center opacity-30"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-100 py-3 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-[#5FA4E6] flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('breadcrumb.home')}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 font-medium">{t('breadcrumb.usefulVideo')}</span>
          </nav>
        </div>
      </div>

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 border-b-4 border-[#5FA4E6] pb-2 inline-block">
          {t('pageTitle')}
          <span className="text-sm font-normal text-gray-500 ml-2">– category –</span>
        </h2>
      </div>

      {/* Videos Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {videos.map((video) => (
            <Link
              href="#"
              key={video.id}
              className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={video.image}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-[#5FA4E6] text-white text-xs font-medium rounded flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {t('category')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#5FA4E6] transition-colors">
                  {video.title}
                </h3>

                {/* Meta Info */}
                <div className="flex items-center justify-between">
                  {/* Date */}
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {video.date}
                  </div>

                  {/* Author */}
                  <div className="flex items-center">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden mr-2">
                      <Image
                        src={video.authorImage}
                        alt={video.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-600">{video.author}</span>
                  </div>
                </div>
              </div>

              {/* Read More */}
              <div className="px-5 pb-5">
                <span className="text-[#5FA4E6] text-sm font-medium group-hover:underline">
                  {t('readMore')} »
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-12">
          <nav className="flex items-center space-x-2">
            <span className="w-10 h-10 flex items-center justify-center bg-gray-300 text-white rounded font-medium">
              1
            </span>
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

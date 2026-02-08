import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export default async function UsefulVideoPage() {
  const t = await getTranslations('usefulVideoPage');

  const videos = [
    {
      id: 1,
      image: '/Useful-video/maxresdefault-7-1024x576.jpg',
      title: t('video1.title'),
      date: t('video1.date'),
      author: t('video1.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 2,
      image: '/Useful-video/maxresdefault-6-1024x576.jpg',
      title: t('video2.title'),
      date: t('video2.date'),
      author: t('video2.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 3,
      image: '/Useful-video/maxresdefault-5-1024x576.jpg',
      title: t('video3.title'),
      date: t('video3.date'),
      author: t('video3.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 4,
      image: '/Useful-video/maxresdefault-4-1024x576.jpg',
      title: t('video4.title'),
      date: t('video4.date'),
      author: t('video4.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 5,
      image: '/Useful-video/maxresdefault-3-1024x576.jpg',
      title: t('video5.title'),
      date: t('video5.date'),
      author: t('video5.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 6,
      image: '/Useful-video/maxresdefault-2-1024x576.jpg',
      title: t('video6.title'),
      date: t('video6.date'),
      author: t('video6.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 7,
      image: '/Useful-video/maxresdefault-1-1024x576.jpg',
      title: t('video7.title'),
      date: t('video7.date'),
      author: t('video7.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
    {
      id: 8,
      image: '/Useful-video/maxresdefault-1-1024x576.jpg',
      title: t('video8.title'),
      date: t('video8.date'),
      author: t('video8.author'),
      authorImage: '/Useful-video/DJI_20241205111013_0078_D-scaled-e1733880357340.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-r from-blue-500/80 to-blue-600/80 py-16 pt-32">
        <div className="absolute inset-0 bg-[url('/Useful-video/maxresdefault-7-1024x576.jpg')] bg-cover bg-center opacity-30"></div>
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
            <Link href="/" className="hover:text-blue-600 flex items-center">
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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 inline-block">
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
                  <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {t('category')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
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
                <span className="text-blue-600 text-sm font-medium group-hover:underline">
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
      <div className="relative py-16 bg-gray-800">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed opacity-40"
          style={{ backgroundImage: "url('/Useful-video/maxresdefault-7-1024x576.jpg')" }}
        ></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-white/90 mb-3">
            {t('cta.description1')}
          </p>
          <p className="text-white/90 mb-8">
            {t('cta.description2')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            {t('cta.button')}
          </Link>
        </div>
      </div>
    </div>
  );
}

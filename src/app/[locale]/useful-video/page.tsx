import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Breadcrumb } from '@/components';
import ArticleGrid from '@/components/article/ArticleGrid';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function UsefulVideoPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const t = await getTranslations('usefulVideoPage');

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-gradient-to-r from-primaryColor/80 to-primaryColor/80 py-16 pt-32">
        <div className="absolute inset-0 bg-[url('/useful-video/video-thumbnail-01.jpg')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.usefulVideo') }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-textPrimary border-b-4 border-primaryColor pb-2 inline-block">
          {t('pageTitle')}
          <span className="text-sm font-normal text-textTertiary ml-2">
            – {t('category')} –
          </span>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ArticleGrid
          category="video"
          detailBasePath="/useful-video"
          locale={locale}
          categoryLabel={t('category')}
          columns="3"
          fallbackImage="/useful-video/video-thumbnail-01.jpg"
          emptyMessage={t('heroSubtitle')}
          page={page}
        />
      </div>

      <section className="relative py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_image.jpeg')" }}
        />
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
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

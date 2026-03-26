import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Breadcrumb } from '@/components';
import ArticleGrid from '@/components/article/ArticleGrid';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function NoticePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const t = await getTranslations('noticePage');

  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-[240px] md:min-h-[280px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/notice/hero-background.jpeg"
            alt="Notice background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-primaryColor/40" />
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

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.notice') }]}
      />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <ArticleGrid
          category="notice"
          detailBasePath="/notice"
          locale={locale}
          categoryLabel={t('category')}
          columns="3"
          fallbackImage="/notice/notice-01.jpeg"
          emptyMessage={t('heroSubtitle')}
          page={page}
        />
      </main>

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

import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Breadcrumb, ContentCardGrid } from '@/components';
import { getArticles } from '@/lib/articles';

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCategoryLabel(category: string, t: (key: string) => string): string {
  const categoryMap: Record<string, string> = {
    'useful-info': t('categoryLabels.usefulInfo'),
    'case-study': t('categoryLabels.caseStudy'),
    'video': t('categoryLabels.video'),
    'notice': t('categoryLabels.notice'),
  };
  return categoryMap[category] || category;
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function UsefulColumnPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations('usefulColumnPage');

  let list: Awaited<ReturnType<typeof getArticles>> = [];
  try {
    list = await getArticles({ category: 'useful-info' });
  } catch (error) {
    console.error('Error fetching articles:', error);
  }

  return (
    <div className="min-h-screen bg-white">
      <div
        className="relative min-h-[280px] md:min-h-[320px] flex flex-col items-start justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/useful-column/hero-background.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-primaryColor/40" />
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 pt-28">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{t('heroTitle')}</h1>
          <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">{t('heroSubtitle')}</p>
        </div>
      </div>

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.usefulColumn') }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ContentCardGrid
          items={list}
          detailBasePath="/useful-column"
          categoryLabel={getCategoryLabel('useful-info', t)}
          formatDate={(iso) => formatDate(iso, locale)}
          emptyMessage={t('noArticles')}
        />

        <div className="flex justify-center mt-12">
          <nav className="flex items-center gap-2">
            <span className="px-4 py-2 bg-borderPrimary text-textSecondary rounded font-medium">1</span>
          </nav>
        </div>
      </div>

      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 whitespace-pre-line">{t('cta.title')}</h2>
          <p className="text-white/80 mb-2 text-base">{t('cta.description1')}</p>
          <p className="text-white/80 mb-10 text-base">{t('cta.description2')}</p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

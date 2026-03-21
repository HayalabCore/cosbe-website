import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { caseStudyCategories } from '@/data/caseStudies';
import { Breadcrumb } from '@/components';
import ArticleGrid from '@/components/article/ArticleGrid';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'caseStudiesPage' });
  return {
    title: t('heroTitle'),
    description: t('heroSubtitle'),
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function CaseStudiesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('caseStudiesPage');

  const categories = caseStudyCategories.map((cat) => ({
    ...cat,
    label: t(cat.labelKey),
    active: cat.id === 'all',
  }));

  return (
    <div className="min-h-screen">
      <div className="relative min-h-[280px] flex flex-col items-start justify-center overflow-hidden px-4 bg-gradient-to-br from-primaryColor/80 to-primaryColor/90">
        <div className="absolute inset-0 bg-gradient-to-b from-primaryColor/40 to-primaryColor/60" />
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{t('heroTitle')}</h1>
            <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">{t('heroSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  cat.active
                    ? 'bg-primaryColor text-white border-2 border-white'
                    : 'bg-white/20 text-white border border-white/50 hover:bg-white/30'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.caseStudies') }]}
      />

      <div className="bg-bgAccent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ArticleGrid
            category="case-study"
            detailBasePath="/case-studies/details"
            locale={locale}
            categoryLabel={t('breadcrumb.caseStudies')}
            emptyMessage={t('noArticles')}
            columns="3"
          />
          <div className="flex justify-center mb-16 mt-12">
            <span className="px-4 py-2 bg-primaryColor text-white rounded font-semibold">1</span>
          </div>
        </div>
      </div>

      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">{t('cta.title')}</h2>
          <p className="text-xl text-white mb-2">{t('cta.subtitle')}</p>
          <p className="text-white/80 mb-2 text-base">{t('cta.description')}</p>
          <p className="text-white/80 mb-10 text-base">{t('cta.message')}</p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

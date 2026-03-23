import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import {
  caseStudies,
  caseStudyCategories,
  categoryToCaseStudies,
  validCategorySlugs,
} from '@/data/caseStudies';
import { Breadcrumb } from '@/components';

type CategoryPageProps = {
  params: Promise<{
    locale: string;
    category: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!validCategorySlugs.includes(category)) {
    notFound();
  }

  const t = await getTranslations('caseStudiesPage');

  const categoryLabelMap: Record<string, string> = {
    efficiency: t('categories.efficiency'),
    'hr-improvement': t('categories.hrImprovement'),
    innovation: t('categories.innovation'),
    'customer-marketing': t('categories.customerMarketing'),
  };

  const currentCategoryTitle = categoryLabelMap[category];
  const caseStudyIds = categoryToCaseStudies[category] || [];
  const filteredCaseStudies = caseStudies.filter((study) =>
    caseStudyIds.includes(study.id)
  );

  const categories = caseStudyCategories.map((cat) => ({
    ...cat,
    label: t(cat.labelKey),
    active: cat.href === `/case-studies/${category}`,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background */}
      <div className="relative min-h-[280px] flex flex-col items-start justify-center overflow-hidden px-4 bg-gradient-to-br from-primaryColor/80 to-primaryColor/90">
        <div className="absolute inset-0 bg-gradient-to-b from-primaryColor/40 to-primaryColor/60"></div>
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {t('heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light tracking-wide">
              {t('heroSubtitle')}
            </p>
          </div>

          {/* Category Tags */}
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
        items={[
          { label: t('breadcrumb.caseStudies'), href: '/case-studies' },
          { label: currentCategoryTitle },
        ]}
      />

      {/* Main Content */}
      <div className="bg-white py-12 min-h-[400px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary border-b-2 border-borderPrimary pb-4">
              {currentCategoryTitle}
              <small className="text-sm font-normal text-textTertiary ml-3">
                – category –
              </small>
            </h2>
          </div>

          {/* Category Navigation */}
          <div className="flex flex-wrap gap-3 mb-12">
            <Link
              href="/case-studies"
              className="px-4 py-2 bg-primaryColor text-white text-sm font-medium rounded hover:bg-primaryColor transition-colors"
            >
              {t('categories.all')}
            </Link>
            <span className="px-4 py-2 bg-primaryColor text-white text-sm font-medium rounded border-2 border-primaryHover">
              {currentCategoryTitle}
            </span>
          </div>

          {/* Case Studies Grid or No Articles */}
          {filteredCaseStudies.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {filteredCaseStudies.map((study) => (
                <Link
                  key={study.id}
                  href={`/case-studies/details/${study.slug}`}
                >
                  <div className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-surface-tertiary cursor-pointer">
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={study.image}
                        alt={t(study.titleKey)}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="px-4 py-1.5 bg-primaryColor/90 backdrop-blur-sm text-white text-sm font-semibold rounded">
                          {t(study.categoryKey)}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-textPrimary mb-4 line-clamp-2 group-hover:text-primaryColor transition-colors">
                        {t(study.titleKey)}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-textTertiary">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{t(study.dateKey)}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-borderSecondary mr-2"></div>
                          <span>{t(study.authorKey)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-textTertiary">{t('noArticles')}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_image.jpeg')" }}
        ></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white mb-2">{t('cta.subtitle')}</p>
          <p className="text-white/80 mb-2 text-base">{t('cta.description')}</p>
          <p className="text-white/80 mb-10 text-base">{t('cta.message')}</p>
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

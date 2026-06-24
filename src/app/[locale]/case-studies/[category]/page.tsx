import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import {
  caseStudyCategories,
  categorySlugToTag,
  validCategorySlugs,
} from '@/data/case-studies';
import { Breadcrumb, PageHero, PAGE_HERO_PRESETS } from '@/components';
import ArticleGrid from '@/components/article/ArticleGrid';
import type { Metadata } from 'next';

type CategoryPageProps = {
  params: Promise<{
    locale: string;
    category: string;
  }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<CategoryPageProps, 'params'>): Promise<Metadata> {
  const { locale, category } = await params;

  if (!validCategorySlugs.includes(category)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'caseStudiesPage' });
  const categoryLabelKey =
    category === 'hr-improvement'
      ? 'categories.hrImprovement'
      : category === 'customer-marketing'
        ? 'categories.customerMarketing'
        : (`categories.${category}` as 'categories.efficiency');

  return {
    title: `${t(categoryLabelKey)} | ${t('heroTitle')}`,
    description: t('heroSubtitle'),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { locale, category } = await params;
  const { page: pageParam } = await searchParams;

  if (!validCategorySlugs.includes(category)) {
    notFound();
  }

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const t = await getTranslations('caseStudiesPage');
  const tag = categorySlugToTag[category];

  const categoryLabelKey =
    category === 'hr-improvement'
      ? 'categories.hrImprovement'
      : category === 'customer-marketing'
        ? 'categories.customerMarketing'
        : (`categories.${category}` as 'categories.efficiency');

  const currentCategoryTitle = t(categoryLabelKey);

  const categories = caseStudyCategories.map((cat) => ({
    ...cat,
    label: t(cat.labelKey),
    active: cat.href === `/case-studies/${category}`,
  }));

  return (
    <div className="min-h-screen">
      <PageHero
        {...PAGE_HERO_PRESETS.listing}
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
      >
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
      </PageHero>

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[
          { label: t('breadcrumb.caseStudies'), href: '/case-studies' },
          { label: currentCategoryTitle },
        ]}
      />

      <div className="bg-bgAccent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ArticleGrid
            category="case-study"
            detailBasePath="/case-studies/details"
            locale={locale}
            categoryLabel={currentCategoryTitle}
            emptyMessage={t('noArticles')}
            columns="3"
            page={page}
            tag={tag}
          />
        </div>
      </div>

      <section className="relative py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_image.jpeg')" }}
        />
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
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

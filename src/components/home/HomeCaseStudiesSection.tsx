import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getArticles } from '@/lib/articles';
import { resolveArticleTitle } from '@/lib/article-locale';
import { formatArticleDate } from '@/lib/format-article-date';
import { imageSrcOrFallback } from '@/lib/article-utils';
import HomeSectionTitle from './HomeSectionTitle';

type CaseCard = {
  href: string;
  title: string;
  category: string;
  date: string;
  image?: string;
};

type HomeCaseStudiesSectionProps = {
  locale: string;
};

export default async function HomeCaseStudiesSection({
  locale,
}: HomeCaseStudiesSectionProps) {
  const t = await getTranslations('homePage.caseStudies');

  let cards: CaseCard[] = [];

  try {
    const articles = await getArticles({
      category: 'case-study',
      pageSize: 3,
    });

    cards = articles.map((item) => ({
      href: `/case-studies/${item.slug}`,
      title: resolveArticleTitle(item, locale),
      category: item.tags[0] ?? t('section'),
      date: formatArticleDate(item.publishedAt, locale),
      image: item.featuredImage,
    }));
  } catch {
    cards = [];
  }

  if (cards.length === 0) {
    const keys = ['case1', 'case2', 'case3'] as const;
    cards = keys.map((key) => ({
      href: '/case-studies',
      title: t(`fallback.${key}.title`),
      category: t(`fallback.${key}.category`),
      date: t(`fallback.${key}.date`),
    }));
  }

  return (
    <section
      id="case-studies"
      className="scroll-mt-24 bg-bgAccent py-14 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeSectionTitle section={t('section')} className="mb-8 md:mb-10" />

        <h3 className="text-lg font-bold text-textHeading md:text-xl">
          {t('title')}
        </h3>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-textSecondary md:text-base">
          {t('description')}
        </p>

        <p className="mt-6 text-xs text-textTertiary md:hidden">
          {t('scrollHint')}
        </p>

        <div className="-mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {cards.map((card) => (
            <Link
              key={`${card.href}-${card.title}`}
              href={card.href}
              className="group w-[min(85vw,320px)] flex-shrink-0 snap-start lg:w-auto"
            >
              <article className="flex h-full flex-col overflow-hidden rounded-lg border border-primaryColor/15 bg-white shadow-md transition-shadow hover:shadow-xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={imageSrcOrFallback(
                      card.image,
                      '/useful-column/article-01.png'
                    )}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="320px"
                  />
                  <span className="absolute left-3 top-3 rounded bg-primaryColor/90 px-3 py-1 text-xs font-semibold text-white">
                    {card.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h4 className="line-clamp-3 text-sm font-bold leading-snug text-textHeading group-hover:text-primaryColor">
                    {card.title}
                  </h4>
                  <p className="mt-auto pt-4 text-xs text-textTertiary">
                    {card.date}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/case-studies"
            className="inline-flex items-center justify-center rounded-full border-2 border-primaryColor bg-white px-8 py-3 text-sm font-bold text-primaryColor transition-colors hover:bg-primaryColor hover:text-white"
          >
            {t('viewAll')}
          </Link>
        </div>
      </div>
    </section>
  );
}

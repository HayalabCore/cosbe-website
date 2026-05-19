import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getArticles } from '@/lib/articles';
import { resolveArticleTitle } from '@/lib/article-locale';
import { formatArticleDate } from '@/lib/format-article-date';
import HomeSectionTitle from './HomeSectionTitle';

type NewsItem = {
  href: string;
  title: string;
  date: string;
};

type HomeNewsSectionProps = {
  locale: string;
};

export default async function HomeNewsSection({
  locale,
}: HomeNewsSectionProps) {
  const t = await getTranslations('homePage.news');

  let items: NewsItem[] = [];

  try {
    const articles = await getArticles({
      category: 'notice',
      pageSize: 5,
    });

    items = articles.map((item) => ({
      href: `/notice/${item.slug}`,
      title: resolveArticleTitle(item, locale),
      date: formatArticleDate(item.publishedAt, locale),
    }));
  } catch {
    items = [];
  }

  if (items.length === 0) {
    const keys = ['item1', 'item2', 'item3', 'item4', 'item5'] as const;
    items = keys.map((key) => ({
      href: '/notice',
      title: t(`fallback.${key}.title`),
      date: t(`fallback.${key}.date`),
    }));
  }

  return (
    <section id="news" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <HomeSectionTitle
          sectionJa={t('sectionJa')}
          sectionEn={t('sectionEn')}
          className="mb-10 md:mb-12"
        />

        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {items.map((item) => (
            <li key={`${item.href}-${item.title}`}>
              <Link
                href={item.href}
                className="group flex flex-col gap-1 py-5 transition-colors hover:bg-bgAccent/50 sm:flex-row sm:items-baseline sm:gap-6 sm:px-2"
              >
                <time className="flex-shrink-0 text-sm font-medium text-textTertiary sm:w-36">
                  {item.date}
                </time>
                <span className="text-sm font-medium leading-relaxed text-textHeading group-hover:text-primaryColor md:text-base">
                  {item.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/notice"
            className="inline-flex items-center justify-center rounded-full border-2 border-primaryColor bg-white px-8 py-3 text-sm font-bold text-primaryColor transition-colors hover:bg-primaryColor hover:text-white"
          >
            {t('viewAll')}
          </Link>
        </div>
      </div>
    </section>
  );
}

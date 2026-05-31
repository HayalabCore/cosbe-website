import { Clock, FolderOpen, ArrowRight } from 'lucide-react';
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
  dateTime?: string;
  category: string;
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
      dateTime: item.publishedAt ?? undefined,
      category: item.tags[0] ?? t('section'),
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
      category: t('section'),
    }));
  }

  return (
    <section id="news" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
          <div>
            <HomeSectionTitle section={t('section')} />
            <div className="mt-8">
              <Link
                href="/notice"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primaryColor px-8 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primaryHover"
              >
                {t('viewAll')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {items.map((item) => (
              <li key={`${item.href}-${item.title}`}>
                <Link
                  href={item.href}
                  className="group block px-2 py-5 transition-colors hover:bg-bgAccent/60 sm:px-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-textTertiary">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <time dateTime={item.dateTime}>{item.date}</time>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FolderOpen
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-textHeading group-hover:text-primaryColor md:text-base">
                    {item.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

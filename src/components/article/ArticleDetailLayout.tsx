import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Breadcrumb from '@/components/shared/Breadcrumb';
import TableOfContents from './TableOfContents';
import BlockRenderer from './BlockRenderer';
import { imageSrcOrFallback } from '@/lib/article-utils';
import { articleDetailHref } from '@/lib/articlePaths';
import type { Article, ArticleListItem, TOCItem } from '@/types';

function formatDateIso(iso: string | null, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export interface ArticleDetailLayoutProps {
  article: Article;
  toc: TOCItem[];
  locale: string;
  homeLabel: string;
  breadcrumbItems: { label: string; href?: string }[];
  categoryBadgeLabel: string;
  tableOfContentsTitle: string;
  writtenByLabel: string;
  relatedArticlesTitle: string;
  relatedArticles: ArticleListItem[];
  cta?: {
    title: string;
    description1: string;
    description2: string;
    button: string;
  };
}

export default function ArticleDetailLayout({
  article,
  toc,
  locale,
  homeLabel,
  breadcrumbItems,
  categoryBadgeLabel,
  tableOfContentsTitle,
  writtenByLabel,
  relatedArticlesTitle,
  relatedArticles,
  cta,
}: ArticleDetailLayoutProps) {
  const featuredSrc = imageSrcOrFallback(article.featuredImage, '');
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null;
  const year = publishedDate?.getFullYear();
  const month = publishedDate ? publishedDate.getMonth() + 1 : 0;
  const day = publishedDate?.getDate();

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb homeLabel={homeLabel} items={breadcrumbItems} />
        </div>
      </div>

      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-5">
            {publishedDate && (
              <div className="flex-shrink-0 text-center border-r border-gray-200 pr-5">
                <span className="block text-xs text-textTertiary">{year}</span>
                <span className="block text-3xl font-bold text-textPrimary leading-tight">
                  {month}/{day}
                </span>
              </div>
            )}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-textPrimary leading-snug flex-1">
              {article.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5 pl-0 md:pl-20">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primaryColor text-white text-xs font-medium rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              {categoryBadgeLabel}
            </span>
            <span className="text-sm text-textTertiary flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDateIso(article.publishedAt, locale)}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            {featuredSrc ? (
              <div className="mb-10">
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm">
                  <Image
                    src={featuredSrc}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 700px"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            ) : null}

            <article className="max-w-none">
              {article.blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </article>

            <div className="mt-12 p-6 bg-gray-50 rounded-xl flex items-start gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow">
                <Image
                  src={imageSrcOrFallback(article.author.avatarUrl, '/useful-column/author-portrait.jpg')}
                  alt={article.author.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs text-textTertiary mb-1">{writtenByLabel}</p>
                <p className="font-bold text-textPrimary">{article.author.name}</p>
                <p className="text-sm text-textSecondary">{article.author.designation}</p>
              </div>
            </div>

            {relatedArticles.length > 0 && (
              <section className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-bold text-textPrimary mb-6">{relatedArticlesTitle}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {relatedArticles.map((a) => (
                    <Link
                      key={a.id}
                      href={articleDetailHref(a.category, a.slug)}
                      className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="relative aspect-video">
                        <Image
                          src={imageSrcOrFallback(a.featuredImage, '/useful-column/article-01.png')}
                          alt={a.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 350px"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-textPrimary group-hover:text-primaryColor transition-colors line-clamp-2 text-sm">
                          {a.title}
                        </h3>
                        <p className="text-xs text-textTertiary mt-2">
                          {formatDateIso(a.publishedAt, locale)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="hidden lg:block lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <TableOfContents items={toc} title={tableOfContentsTitle} />
          </aside>
        </div>
      </div>

      {cta && (
        <section className="relative py-20 md:py-24 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/bg_image.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 whitespace-pre-line">
              {cta.title}
            </h2>
            <p className="text-white/80 mb-2 text-base">{cta.description1}</p>
            <p className="text-white/80 mb-10 text-base">{cta.description2}</p>
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
              {cta.button}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

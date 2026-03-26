import Image from 'next/image';
import { Link } from '@/i18n/routing';
import {
  resolveArticleExcerpt,
  resolveArticleTitle,
} from '@/lib/article-locale';
import { imageSrcOrFallback } from '@/lib/article-utils';
import type { ArticleListItem } from '@/types';

export interface ContentCardGridProps {
  items: ArticleListItem[];
  /** Locale for title/excerpt resolution (English alternates on /en). */
  locale?: string;
  /** e.g. `/useful-column` — detail link becomes `${basePath}/${slug}` */
  detailBasePath: string;
  categoryLabel?: string;
  fallbackImage?: string;
  fallbackAuthorImage?: string;
  formatDate: (publishedAt: string | null) => string;
  emptyMessage?: string;
  /** md:grid-cols-2 (case studies) vs md:grid-cols-3 */
  columns?: '2' | '3';
}

export default function ContentCardGrid({
  items,
  locale = 'ja',
  detailBasePath,
  categoryLabel,
  fallbackImage = '/useful-column/article-01.png',
  fallbackAuthorImage = '/useful-column/author-portrait.jpg',
  formatDate,
  emptyMessage,
  columns = '3',
}: ContentCardGridProps) {
  const gridClass =
    columns === '2' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3';

  if (items.length === 0 && emptyMessage) {
    return (
      <p className="text-center text-textTertiary py-16">{emptyMessage}</p>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {items.map((item) => {
        const cardTitle = resolveArticleTitle(item, locale);
        const cardExcerpt = resolveArticleExcerpt(item, locale);
        return (
          <Link
            key={item.id}
            href={`${detailBasePath}/${item.slug}`}
            className="group block active:scale-[0.98] transition-transform duration-100"
          >
            <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-primaryColor/15 hover:border-primaryColor h-full flex flex-col group-active:opacity-80">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={imageSrcOrFallback(item.featuredImage, fallbackImage)}
                  alt={cardTitle}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {categoryLabel && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-primaryColor/90 text-white text-xs font-semibold rounded">
                      {categoryLabel}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-textPrimary mb-3 line-clamp-2 group-hover:text-primaryColor transition-colors">
                  {cardTitle}
                </h3>
                {cardExcerpt ? (
                  <p className="text-sm text-textSecondary line-clamp-2 mb-4 flex-1">
                    {cardExcerpt}
                  </p>
                ) : null}
                <div className="flex items-center justify-between text-sm text-textTertiary mt-auto pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
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
                    {formatDate(item.publishedAt)}
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={imageSrcOrFallback(
                          item.author.avatarUrl,
                          fallbackAuthorImage
                        )}
                        alt={item.author.name}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </span>
                    <span className="truncate text-xs">{item.author.name}</span>
                  </span>
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}

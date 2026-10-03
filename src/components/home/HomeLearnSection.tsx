import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { getArticles, getLatestVideos } from '@/lib/articles';
import {
  resolveArticleExcerpt,
  resolveArticleTitle,
} from '@/lib/article-locale';
import { articleDetailHref } from '@/lib/article-paths';
import { imageSrcOrFallback } from '@/lib/article-utils';
import { formatArticleDate } from '@/lib/format-article-date';
import type { ArticleListItem, VideoItem } from '@/types';
import LearnTabs from './LearnTabs';
import LearnVideoCarousel from './LearnVideoCarousel';

function LearnRow({
  href,
  image,
  imageAlt,
  date,
  chip,
  title,
  excerpt,
}: {
  href: string;
  image: string;
  imageAlt: string;
  date?: string;
  chip?: string;
  title: string;
  excerpt?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 sm:flex-row sm:gap-10"
    >
      <div className="relative aspect-[260/146] w-full shrink-0 overflow-hidden bg-bgTertiary sm:w-[260px]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 260px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 sm:pt-[10px]">
        {(date || chip) && (
          <div className="flex flex-wrap items-center gap-[18px]">
            {date && (
              <span className="text-base font-medium leading-[1.2] text-[#a1a1a1]">
                {date}
              </span>
            )}
            {chip && (
              <span className="rounded-full bg-primaryColor/20 px-[19px] py-1 text-xs font-medium leading-[1.2] text-primaryColor">
                {chip}
              </span>
            )}
          </div>
        )}
        <h4 className="mt-[18px] line-clamp-2 text-lg font-medium! leading-6 group-hover:text-primaryColor sm:text-xl">
          {title}
        </h4>
        {excerpt && (
          <p className="mt-6 line-clamp-2 text-sm font-medium leading-[1.2] sm:text-base">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function HomeLearnSection({ locale }: { locale: string }) {
  const t = await getTranslations('homePage.learn');
  const tDownload = await getTranslations('downloadPage');

  const [videos, videoArticles] = await Promise.all([
    getLatestVideos(5).catch((): VideoItem[] => []),
    getArticles({ category: 'video', pageSize: 3 }).catch(
      (): ArticleListItem[] => []
    ),
  ]);

  const columnRows = (
    <div className="space-y-[26px]">
      {videoArticles.map((article) => {
        const title = resolveArticleTitle(article, locale);
        return (
          <LearnRow
            key={article.id}
            href={articleDetailHref('video', article.slug)}
            image={imageSrcOrFallback(
              article.featuredImage,
              '/useful-video/video-thumbnail-01.jpg'
            )}
            imageAlt={title}
            date={formatArticleDate(article.publishedAt, locale)}
            chip={article.tags[0]}
            title={title}
            excerpt={resolveArticleExcerpt(article, locale)}
          />
        );
      })}
    </div>
  );

  // Materials are not a CMS collection yet: the one document is on /download.
  const materialRows = (
    <LearnRow
      href="/download"
      image="/material-download/download-preview.png"
      imageAlt={tDownload('documentTitle')}
      title={tDownload('documentTitle')}
      excerpt={tDownload('overview.description')}
    />
  );

  return (
    <section className="overflow-x-clip text-textDark">
      <div className="border-b border-textDark">
        <div className="relative mx-auto flex h-[150px] max-w-[1352px] items-end px-4 pb-5 sm:px-6 lg:h-[241px] lg:px-0 lg:pb-8">
          <Image
            src="/home/top/learning.png"
            alt=""
            width={288}
            height={288}
            className="pointer-events-none absolute right-2 top-0 w-[150px] lg:right-[-9px] lg:w-[288px]"
          />
          <h2 className="relative max-w-[60%] text-[28px] font-medium! leading-[1.2] lg:max-w-none lg:pl-[108px] lg:text-[36px]">
            {t('title')}
          </h2>
        </div>
      </div>

      <div className="mx-auto max-w-[1352px] px-4 pb-4 pt-12 sm:px-6 lg:pl-[173px] lg:pr-[141px] lg:pt-[75px]">
        {videos.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[282px_minmax(0,756px)] lg:gap-0">
            <h3 className="w-fit border-b-4 border-primaryColor pb-3 text-xl font-medium! leading-[1.2] sm:text-2xl lg:h-fit">
              {t('youtube')}
            </h3>
            <LearnVideoCarousel
              videos={videos.map((v) => ({
                id: v.id,
                title: resolveArticleTitle(v, locale),
                href: articleDetailHref('video', v.slug),
                thumbnail:
                  v.featuredImage ||
                  `https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`,
                youtubeId: v.youtubeId,
              }))}
              labels={{
                previous: t('previous'),
                next: t('next'),
                play: t('play'),
              }}
            />
          </div>
        )}

        <div className="mt-16 lg:mt-20">
          <LearnTabs
            moreLabel={t('more')}
            tabs={[
              {
                key: 'columns',
                label: t('columns'),
                content: columnRows,
                moreHref: '/useful-video',
              },
              {
                key: 'materials',
                label: t('materials'),
                content: materialRows,
                moreHref: '/download',
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

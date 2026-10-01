import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { getCaseStudyCards } from '@/lib/articles';
import { pickForLocale, resolveArticleTitle } from '@/lib/article-locale';
import { articleDetailHref } from '@/lib/article-paths';
import type { CaseStudyCardItem } from '@/types';

const BULLETS = [
  ['uniqueValue', 'uniqueValueEn'],
  ['mainChallenges', 'mainChallengesEn'],
  ['solution', 'solutionEn'],
  ['result', 'resultEn'],
] as const;

async function CaseStudyCard({
  item,
  locale,
}: {
  item: CaseStudyCardItem;
  locale: string;
}) {
  const t = await getTranslations('caseStudiesSection');
  const bullets = BULLETS.map(([ja, en]) => ({
    key: ja,
    text: pickForLocale(locale, item[ja], item[en]),
  })).filter((b) => b.text);
  const excerpt = pickForLocale(locale, item.excerpt, item.excerptEn);
  const industry = pickForLocale(locale, item.industry, item.industryEn);

  return (
    <Link
      href={articleDetailHref('case-study', item.slug)}
      className="group flex min-h-[323px] flex-col rounded-tr-[14px] border border-textDark bg-white px-6 pb-[38px] pt-[39px] text-textDark transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] sm:px-12"
    >
      {industry && (
        <p className="mb-[11px] text-base font-medium leading-[1.2]">
          {industry}
        </p>
      )}
      <h3 className="line-clamp-2 text-base font-medium! leading-[1.2] group-hover:text-primaryColor">
        {resolveArticleTitle(item, locale)}
      </h3>
      {bullets.length > 0 ? (
        <ul className="mt-[27px] list-disc pl-5 text-sm font-medium leading-[1.2] text-[#7b7b7b]">
          {bullets.map((b) => (
            <li key={b.key}>
              {t(`labels.${b.key}`)}
              {b.text}
            </li>
          ))}
        </ul>
      ) : (
        excerpt && (
          <p className="mt-[27px] line-clamp-5 text-sm font-medium leading-[1.2] text-[#7b7b7b]">
            {excerpt}
          </p>
        )
      )}
      {item.tags.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-[10px] pt-6">
          {item.tags.slice(0, 3).map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-primaryColor/20 px-[14px] py-1 text-xs font-medium leading-[1.2] text-primaryColor"
            >
              # {tag}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

/** 導入事例: latest three published case studies (home, AX and partners pages). */
export default async function CaseStudiesSection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations('caseStudiesSection');

  let items: CaseStudyCardItem[] = [];
  try {
    items = await getCaseStudyCards(3);
  } catch {
    items = [];
  }

  return (
    <section id="case-studies" className="scroll-mt-24">
      <div className="relative mx-auto flex h-[150px] max-w-[1352px] items-end justify-between px-4 pb-4 sm:px-6 lg:h-[215px] lg:px-0 lg:pb-6">
        <Image
          src="/home/top/case-studies-magnifier.png"
          alt=""
          width={236}
          height={236}
          className="pointer-events-none absolute left-0 top-0 z-10 w-[140px] lg:left-[13px] lg:w-[236px]"
        />
        {/* Stacked beside the art on mobile; spread across the row on desktop. */}
        <div className="flex flex-col items-start gap-2 pl-[130px] lg:contents">
          <h2 className="whitespace-nowrap text-[28px] font-medium! leading-[1.2] text-textDark lg:pl-[131px] lg:text-[36px]">
            {t('title')}
          </h2>
          <Link
            href="/case-studies"
            className="group inline-flex items-center gap-[11px] whitespace-nowrap text-sm font-medium leading-[1.2] text-textDark hover:text-primaryColor sm:text-base lg:mb-[4px] lg:mr-[26px]"
          >
            {t('viewAll')}
            <Image
              src="/home/top/arrow-right-blue.png"
              alt=""
              width={22}
              height={21}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>

      <div className="border-y border-textDark">
        <div className="mx-auto grid max-w-[1352px] gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:gap-[43px] lg:px-0 lg:pb-[81px] lg:pt-[78px]">
          {items.map((item) => (
            <CaseStudyCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}

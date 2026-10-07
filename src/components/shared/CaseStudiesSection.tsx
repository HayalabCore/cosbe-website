import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

const FIELDS = ['uniqueValue', 'mainChallenges', 'solution', 'result'] as const;

type CaseStudyItem = Record<(typeof FIELDS)[number] | 'industry', string>;

function CaseStudyCard({ item }: { item: CaseStudyItem }) {
  const t = useTranslations('caseStudiesSection');

  return (
    <div className="flex min-h-[323px] flex-col rounded-tr-[14px] border border-textDark bg-white px-6 pb-[38px] pt-[39px] text-textDark sm:px-12">
      <h3 className="text-base font-medium! leading-[1.2]">{item.industry}</h3>
      <ul className="mt-[27px] list-disc space-y-2 pl-5 text-sm font-medium leading-[1.4] text-[#7b7b7b]">
        {FIELDS.map((key) => (
          <li key={key}>
            {t(`labels.${key}`)}
            {item[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 導入事例: three fixed, text-only cases (home, AX and partners pages). */
export default function CaseStudiesSection() {
  const t = useTranslations('caseStudiesSection');
  const items = t.raw('items') as CaseStudyItem[];

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
            <CaseStudyCard key={item.industry} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

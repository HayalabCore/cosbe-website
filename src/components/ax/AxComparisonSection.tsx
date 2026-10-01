import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

type Variant = 'typical' | 'transformation';

// Card offsets from the design; the transformation card overlaps the first.
const CARDS: Record<
  Variant,
  {
    image: string;
    cardClass: string;
    contentClass: string;
    imageClass: string;
  }
> = {
  typical: {
    image: '/ai-transformation/v2/typical-ai.png',
    cardClass: 'bg-[#f4f4f4] lg:left-0 lg:top-0',
    contentClass: 'lg:pl-[115px]',
    imageClass: 'lg:right-[101px]',
  },
  transformation: {
    image: '/ai-transformation/v2/transformation.png',
    cardClass: 'bg-bgSoft lg:right-0 lg:top-[326px]',
    contentClass: 'lg:pl-[102px]',
    imageClass: 'lg:right-[78px]',
  },
};

async function ComparisonCard({ variant }: { variant: Variant }) {
  const t = await getTranslations(`axPage.comparison.${variant}`);
  const card = CARDS[variant];
  const items = [0, 1, 2, 3].map((i) => t(`items.${i}`));

  return (
    <div
      className={`relative flex flex-col items-center gap-6 rounded-[15px] px-6 py-10 sm:flex-row sm:items-start sm:justify-between lg:absolute lg:block lg:h-[367px] lg:w-[888px] lg:p-0 ${card.cardClass}`}
    >
      <div className={`lg:pt-[79px] ${card.contentClass}`}>
        <h3 className="flex items-center gap-[15px] text-xl font-medium! leading-[30px] text-textDark sm:text-2xl">
          <Image
            src="/ai-transformation/v2/caret-right.png"
            alt=""
            width={25}
            height={25}
          />
          {t('heading')}
        </h3>
        <ul className="mt-[19px] space-y-[11px] pl-10 text-base font-medium leading-[30px] text-textDark">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <Image
        src={card.image}
        alt={t('imageAlt')}
        width={299}
        height={285}
        className={`shrink-0 lg:absolute lg:top-[41px] ${card.imageClass}`}
      />
    </div>
  );
}

export default async function AxComparisonSection() {
  const t = await getTranslations('axPage.comparison');

  return (
    <section className="px-4 sm:px-6">
      <h2 className="text-center text-2xl sm:whitespace-pre-line font-medium! leading-[1.2] text-textDark sm:text-[32px]">
        {t('title')}
      </h2>
      <div className="relative mx-auto mt-[26px] flex max-w-[1182px] flex-col gap-6 lg:block lg:h-[693px]">
        <ComparisonCard variant="typical" />
        <ComparisonCard variant="transformation" />
      </div>
    </section>
  );
}

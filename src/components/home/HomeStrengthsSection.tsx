import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

// Per-card art and offsets from the design: each illustration sits at its own
// position inside the capsule, and the heading overlaps the art's empty base.
const CARDS = [
  {
    src: '/home/top/strength-business.png',
    width: 350,
    height: 352,
    imageClass: '-translate-x-[11px]',
    headingClass: '-mt-[31px]',
    bodyClass: 'mt-[21px]',
  },
  {
    src: '/home/top/strength-technology.png',
    width: 352,
    height: 351,
    imageClass: 'mt-[2px] -translate-x-[5px]',
    headingClass: '-mt-[37px]',
    bodyClass: 'mt-[17px]',
  },
  {
    src: '/home/top/strength-methodology.png',
    width: 290,
    height: 289,
    imageClass: 'mt-[26px]',
    headingClass: 'mt-[19px]',
    bodyClass: 'mt-[14px]',
  },
] as const;

const accent = (chunks: React.ReactNode) => (
  <span className="text-primaryColor">{chunks}</span>
);

export default async function HomeStrengthsSection() {
  const t = await getTranslations('homePage.strengths');

  return (
    <section className="px-4 pt-24 text-center text-textDark sm:px-6 lg:pt-[120px]">
      <p className="text-base font-medium leading-[1.2] sm:text-xl">
        {t('eyebrow')}
      </p>
      <h2 className="mt-3 text-[28px] font-medium! leading-[1.2] lg:text-[36px]">
        {t.rich('title', { accent })}
      </h2>

      {/* The middle card drops 82px; translating it keeps all three the same
          height, and the grid's bottom padding reserves the space. */}
      <div className="mx-auto mt-12 grid max-w-[376px] gap-10 lg:mt-3 lg:max-w-[1207px] lg:grid-cols-3 lg:gap-[39px] lg:pb-[82px]">
        {CARDS.map((card, i) => (
          <article
            key={card.src}
            className={`flex min-h-[535px] flex-col items-center overflow-hidden rounded-[201px] bg-white px-[13px] pb-[43px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] ${
              i === 1 ? 'lg:translate-y-[82px]' : ''
            }`}
          >
            <Image
              src={card.src}
              alt={t(`items.${i}.imageAlt`)}
              width={card.width}
              height={card.height}
              className={`max-w-none shrink-0 ${card.imageClass}`}
            />
            <h3
              className={`relative whitespace-pre-line text-lg font-medium! leading-7 sm:text-xl ${card.headingClass}`}
            >
              {t.rich(`items.${i}.heading`, { accent })}
            </h3>
            <p
              className={`max-w-[282px] text-sm font-medium leading-5 ${card.bodyClass}`}
            >
              {t(`items.${i}.body`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

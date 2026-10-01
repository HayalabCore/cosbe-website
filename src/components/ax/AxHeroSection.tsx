import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

// Halftone discs behind the headline, positioned from the page centre.
const DOTS = [
  {
    src: '/ai-transformation/v2/dots-small.webp',
    size: 239,
    className: 'left-[calc(50%-492px)] top-[45px]',
  },
  {
    src: '/ai-transformation/v2/dots-large.webp',
    size: 485,
    className: 'left-[calc(50%+59px)] top-[68px]',
  },
  {
    src: '/ai-transformation/v2/dots-medium.webp',
    size: 339,
    className: 'left-[calc(50%-359px)] top-[428px]',
  },
] as const;

export default async function AxHeroSection() {
  const t = await getTranslations('axPage.hero');

  return (
    <section className="relative overflow-x-clip px-4 py-24 text-center sm:px-6 lg:h-[738px] lg:py-0 lg:pt-[193px]">
      {DOTS.map((dot) => (
        <Image
          key={dot.src}
          src={dot.src}
          alt=""
          width={dot.size}
          height={dot.size}
          priority
          className={`pointer-events-none absolute hidden max-w-none lg:block ${dot.className}`}
        />
      ))}
      <Image
        src="/ai-transformation/v2/dots-large.webp"
        alt=""
        width={485}
        height={485}
        className="pointer-events-none absolute left-1/2 top-4 w-[360px] max-w-none -translate-x-1/2 lg:hidden"
      />
      <div className="relative">
        <h1 className="text-[28px] sm:whitespace-pre-line font-medium! leading-[1.45] text-textDark sm:text-[36px] lg:text-[48px] lg:leading-[70px]">
          {t('title')}
        </h1>
        <p className="mt-10 whitespace-pre-line text-base font-medium leading-[30px] text-black sm:text-xl lg:mt-[67px]">
          {t('subtitle')}
        </p>
      </div>
    </section>
  );
}

import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

function HeroArrowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 text-base font-medium leading-7 text-textDark transition-colors hover:text-primaryColor"
    >
      {children}
      <Image
        src="/home/top/arrow-button.svg"
        alt=""
        width={51}
        height={51}
        className="transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

export default async function HomeHeroSection() {
  const t = await getTranslations('homePage.hero');

  return (
    <section className="relative overflow-x-clip">
      <div className="relative mx-auto flex max-w-[980px] flex-col px-4 pb-12 sm:px-6 lg:block lg:h-[550px] lg:px-0 lg:pb-0">
        <div className="relative z-10 order-2 lg:pt-[163px]">
          <h1 className="whitespace-pre-line text-[28px] font-medium! leading-[1.5] text-textDark sm:text-[34px] lg:text-[40px] lg:leading-[60px]">
            {t.rich('title', {
              accent: (chunks) => (
                <span className="text-primaryColor">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-4 text-sm font-medium leading-7 text-textDark sm:text-base lg:mt-5">
            {t('subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4 lg:mt-12">
            <HeroArrowLink href="/contact">{t('consult')}</HeroArrowLink>
            <HeroArrowLink href="/download">{t('materials')}</HeroArrowLink>
          </div>
        </div>

        {/* The image includes the soft glow around the character, so it bleeds
            past the content column and under the next section. */}
        <div className="pointer-events-none relative order-1 mx-auto -mb-[10%] aspect-[729/617] w-full max-w-[520px] lg:absolute lg:left-[373px] lg:top-[14px] lg:m-0 lg:w-[729px] lg:max-w-none">
          <Image
            src="/home/top/hero-character.webp"
            alt={t('characterAlt')}
            fill
            priority
            sizes="(max-width: 1024px) 520px, 729px"
            className="object-contain"
          />
        </div>
      </div>
    </section>
  );
}

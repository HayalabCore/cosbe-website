import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export default async function HomeTeamSection() {
  const t = await getTranslations('homePage.team');

  return (
    <section className="px-4 pb-[46px] pt-16 text-center text-textDark sm:px-6 lg:pt-[97px]">
      <h2 className="text-[28px] font-medium! leading-[1.2] lg:text-[36px]">
        {t('title')}
      </h2>
      <p className="mx-auto mt-[18px] max-w-[1027px] whitespace-pre-line text-sm font-medium leading-6 sm:text-base">
        {t('description')}
      </p>
      <Image
        src="/cosbe-worldmap.png"
        alt={t('mapAlt')}
        width={797}
        height={448}
        sizes="(max-width: 845px) 100vw, 797px"
        className="mx-auto mt-[21px] h-auto w-full max-w-[797px]"
      />
      {/* Below the map: in the design this link sits under the map layer. */}
      <Link
        href="/company"
        className="group mt-4 inline-flex items-center gap-[11px] text-base font-medium leading-[1.2] hover:text-primaryColor"
      >
        {t('cta')}
        <Image
          src="/home/top/arrow-right-blue.png"
          alt=""
          width={22}
          height={21}
          className="transition-transform group-hover:translate-x-1"
        />
      </Link>
    </section>
  );
}

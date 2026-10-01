import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { PARTNERS } from '@/lib/partners';

export default async function HomePartnersSection() {
  const t = await getTranslations('homePage.partners');
  const tNames = await getTranslations('partnerNames');

  return (
    <section
      id="partners"
      className="scroll-mt-24 bg-bgSoft px-4 pb-[79px] pt-16 text-center text-textDark sm:px-6 lg:pt-[76px]"
    >
      <h2 className="text-[28px] font-medium! leading-[1.2] lg:text-[36px]">
        {t('title')}
      </h2>
      <p className="mt-[11px] text-base font-medium leading-[1.2] sm:text-xl">
        {t('description')}
      </p>
      <ul className="mx-auto mt-[26px] grid max-w-[931px] gap-5 sm:grid-cols-3 sm:gap-[50px]">
        {PARTNERS.map((p) => (
          <li
            key={p.key}
            className="flex h-[134px] items-center justify-center bg-white"
          >
            <Image
              src={p.logo}
              alt={tNames(p.key)}
              width={p.width}
              height={p.height}
            />
          </li>
        ))}
      </ul>
      <Link
        href="/partners"
        className="group mt-[21px] inline-flex items-center gap-[11px] text-base font-medium leading-[1.2] hover:text-primaryColor"
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

import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { PARTNERS } from '@/lib/partners';

export default async function PartnersSpecialtiesSection() {
  const t = await getTranslations('partnersPage.specialties');
  const tNames = await getTranslations('partnerNames');

  return (
    <section className="bg-bgSoft px-4 pb-[163px] pt-20 text-textDark sm:px-6 lg:pt-[112px]">
      <div className="text-center">
        <h2 className="text-[28px] font-medium! leading-[1.2] lg:text-[36px]">
          {t('title')}
        </h2>
        <p className="mt-[11px] text-base font-medium leading-6 sm:whitespace-pre-line sm:text-xl">
          {t('description')}
        </p>
      </div>
      <ul className="mx-auto mt-12 max-w-[1138px] lg:mt-[89px]">
        {PARTNERS.map((p, i) => (
          <li
            key={p.key}
            className={`flex flex-col gap-6 border-b border-black pb-[39px] md:flex-row md:gap-[77px] md:px-4 ${
              i > 0 ? 'pt-[75px]' : ''
            }`}
          >
            <div className="flex h-[134px] w-full shrink-0 items-center justify-center bg-white md:mt-3 md:w-[277px]">
              <Image
                src={p.logo}
                alt={tNames(p.key)}
                width={p.width}
                height={p.height}
              />
            </div>
            <div>
              <h3 className="text-xl font-medium! leading-6">
                {tNames(p.key)}
              </h3>
              <p className="mt-[11px] text-base font-medium leading-[1.2] text-primaryColor">
                {t(`items.${p.key}.tagline`)}
              </p>
              <p className="mt-6 text-base leading-[22px]">
                {t(`items.${p.key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

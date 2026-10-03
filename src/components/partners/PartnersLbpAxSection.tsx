import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

export default async function PartnersLbpAxSection() {
  const t = await getTranslations('partnersPage.lbpAx');

  return (
    <section className="px-4 py-24 text-textDark sm:px-6 lg:py-[139px]">
      <div className="mx-auto flex max-w-[1103px] flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-[60px]">
        <Image
          src="/partners/lbp-ax.webp"
          alt={t('logoAlt')}
          width={439}
          height={146}
          className="w-full max-w-[439px] shrink-0 lg:mt-[22px]"
        />
        <div>
          <h2 className="text-2xl font-medium! leading-[1.35] sm:whitespace-pre-line sm:text-[32px] sm:leading-[43px]">
            {/* Word joiner stops the line from breaking after 「、」. */}
            {t('title').replaceAll('、', '、\u2060')}
          </h2>
          <p className="mt-9 text-base leading-[22px]">{t('body')}</p>
        </div>
      </div>
    </section>
  );
}

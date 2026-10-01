import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

function AudienceButton({ label, cta }: { label: string; cta: string }) {
  return (
    <Link
      href="/contact"
      className="group flex min-h-[69px] items-center justify-center gap-4 rounded-full border border-primaryColor bg-white px-6 py-2 transition-colors hover:bg-bgSoft"
    >
      <span className="text-center leading-7">
        <span className="block text-sm font-medium text-textDark">{label}</span>
        <span className="block text-base font-bold text-primaryColor">
          {cta}
        </span>
      </span>
      <Image
        src="/home/top/arrow-right-blue.png"
        alt=""
        width={22}
        height={21}
        className="shrink-0 transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

export default async function PartnersHeroSection() {
  const t = await getTranslations('partnersPage.hero');

  return (
    <section className="overflow-x-clip px-4 py-12 text-textDark sm:px-6 lg:py-0">
      <div className="relative mx-auto flex max-w-[1199px] flex-col gap-8 lg:block lg:h-[646px]">
        <Image
          src="/partners/hero-consulting.webp"
          alt={t('imageAlt')}
          width={487}
          height={480}
          priority
          className="mx-auto w-full max-w-[360px] lg:absolute lg:right-0 lg:top-[50px] lg:max-w-none lg:w-[487px]"
        />
        <div className="relative lg:pt-[125px]">
          <h1 className="text-[28px] font-medium! leading-[1.5] sm:whitespace-pre-line sm:text-[34px] lg:pl-[11px] lg:text-[40px] lg:leading-[60px]">
            {t.rich('title', {
              accent: (chunks) => (
                <span className="text-primaryColor">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-8 text-sm font-medium leading-7 sm:whitespace-pre-line sm:text-base lg:mt-[52px] lg:pl-[11px]">
            {t('description')}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap lg:mt-[37px] lg:gap-9">
            <AudienceButton label={t('owners.label')} cta={t('owners.cta')} />
            <AudienceButton
              label={t('consultants.label')}
              cta={t('consultants.cta')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

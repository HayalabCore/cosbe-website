import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function HomeServiceSection() {
  const t = await getTranslations('homePage.service');

  return (
    <section
      id="service"
      className="scroll-mt-24 bg-primaryColor py-14 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="text-white">
            <p className="text-sm font-semibold md:text-base">
              {t('sectionJa')}
            </p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl lg:text-[2.5rem]">
              {t('sectionEn')}
            </h2>
            <h3 className="mt-6 text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
              {t('title')}
            </h3>
            <p className="mt-4 text-sm font-medium leading-relaxed md:text-base">
              {t('eyebrow')}
            </p>
            <hr className="mt-6 border-white/60" />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/95 md:text-base">
              <p>{t('p1')}</p>
              <p>{t('p2')}</p>
            </div>
            <div className="mt-8">
              <Link
                href="/ai-lab"
                className="inline-flex items-center justify-center rounded-full bg-white px-10 py-3.5 text-sm font-bold text-primaryColor shadow-md transition-colors hover:bg-white/90"
              >
                {t('viewMore')} →
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl shadow-xl sm:max-w-lg lg:max-w-xl">
              <Image
                src="/home/about.jpg"
                alt={t('imageAlt')}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 576px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function HomeAboutSection() {
  const t = await getTranslations('homePage.about');

  return (
    <section id="about" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <div>
            <p className="text-sm font-semibold text-primaryColor md:text-base">
              {t('sectionJa')}
            </p>
            <h2 className="mt-1 text-3xl font-bold text-primaryColor md:text-4xl lg:text-[2.5rem]">
              {t('sectionEn')}
            </h2>
            <h3 className="mt-6 whitespace-pre-line text-lg font-bold leading-snug text-textPrimary md:text-xl lg:text-2xl">
              {t('heading')}
            </h3>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-textPrimary md:text-base">
              <p>{t('p1')}</p>
              <p>{t('p2')}</p>
              <p>{t('p3')}</p>
            </div>
            <div className="mt-8">
              <Link
                href="/company"
                className="inline-flex items-center justify-center rounded-full bg-primaryColor px-10 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primaryHover"
              >
                {t('viewMore')} →
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative h-40 w-full max-w-md sm:h-48 md:h-56 lg:h-64">
              <Image
                src="/home/about-logo.png"
                alt={t('imageAlt')}
                fill
                className="object-contain object-center lg:object-right"
                sizes="(max-width: 1024px) 80vw, 420px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

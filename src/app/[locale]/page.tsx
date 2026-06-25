import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import HomeNavCards from '@/components/home/HomeNavCards';
import HomeAboutSection from '@/components/home/HomeAboutSection';
import HomeServiceSection from '@/components/home/HomeServiceSection';
import HomeCaseStudiesSection from '@/components/home/HomeCaseStudiesSection';
import HomeCaseStudiesSectionSkeleton from '@/components/home/HomeCaseStudiesSectionSkeleton';
import HomeNewsSection from '@/components/home/HomeNewsSection';
import HomeNewsSectionSkeleton from '@/components/home/HomeNewsSectionSkeleton';
import CtaSection from '@/components/shared/CtaSection';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });

  const title = `CosBE - ${t('headline')}`;
  const description = `${t('eyebrow')} — ${t('headline')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const tHero = await getTranslations('hero');
  const tCta = await getTranslations('homePage.cta');

  const navCards = [
    { href: '#about', label: tHero('nav.aboutCosbe') },
    { href: '#service', label: tHero('nav.fastAiLab') },
    { href: '#case-studies', label: tHero('nav.caseStudies') },
    { href: '#news', label: tHero('nav.notice') },
  ];

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--color-textHeading) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="order-2 text-center lg:order-1 lg:text-left">
              <p className="text-xl font-bold tracking-tight text-textHeading sm:text-2xl md:text-[1.75rem]">
                {tHero('eyebrow')}
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-textHeading sm:text-4xl md:text-[2.5rem] lg:text-[2.75rem]">
                {tHero('headline')}
              </h1>
              <div className="mt-8 flex justify-center lg:justify-start">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center rounded-full bg-primaryColor px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primaryHover sm:px-8 sm:py-4 sm:text-base"
                >
                  {tHero('ctaDownload')}
                </Link>
              </div>
            </div>

            <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
              <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[520px] xl:max-w-[580px]">
                <Image
                  src="/main_page_1200x1200.jpg"
                  alt={tHero('illustrationAlt')}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 1024px) 90vw, 580px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <HomeNavCards cards={navCards} />
      </section>

      <HomeAboutSection />
      <HomeServiceSection />
      <Suspense fallback={<HomeCaseStudiesSectionSkeleton />}>
        <HomeCaseStudiesSection locale={locale} />
      </Suspense>
      <Suspense fallback={<HomeNewsSectionSkeleton />}>
        <HomeNewsSection locale={locale} />
      </Suspense>

      <CtaSection
        title={tCta('title')}
        description={tCta('description')}
        additionalText={tCta('additionalText')}
        buttonText={tCta('button')}
        buttonHref="/contact"
      />
    </div>
  );
}

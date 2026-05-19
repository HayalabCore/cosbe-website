'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';
import {
  Breadcrumb,
  CtaSection,
  PageHero,
  PAGE_HERO_PRESETS,
  PriceBreakdownCard,
  PricingComparisonTable,
} from '@/components';

function SectionWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      className={`block w-full h-8 md:h-12 ${className ?? ''}`}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0,32 C360,48 720,16 1440,32 L1440,48 L0,48 Z"
      />
    </svg>
  );
}

function GridPatternCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-white shadow-sm">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--color-primaryColor) 12%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--color-primaryColor) 12%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function AiLabPage() {
  const t = useTranslations('aiLabPage');
  const locale = useLocale() as Locale;

  const challenges = [
    { key: 'challenge1', image: '/ai-lab/challenge1.webp' },
    { key: 'challenge2', image: '/ai-lab/challenge2.webp' },
    { key: 'challenge3', image: '/ai-lab/challenge3.webp' },
  ] as const;

  const features = [
    { key: 'feature1', image: '/ai-lab/feature1.webp' },
    { key: 'feature2', image: '/ai-lab/feature2.jpeg' },
    { key: 'feature3', image: '/ai-lab/feature3.jpeg' },
  ] as const;

  const benefits = [
    { key: 'benefit1', image: '/ai-lab/benefit1.jpg' },
    { key: 'benefit2', image: '/ai-lab/benefit2.jpg' },
    { key: 'benefit3', image: '/ai-lab/benefit3.jpg' },
  ] as const;

  const caseStudies = [
    { key: 'case1', image: '/ai-lab/training-agent.png' },
    { key: 'case2', image: '/ai-lab/new-business-2months.png' },
    { key: 'case3', image: '/ai-lab/resume-from-en.png' },
  ] as const;

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        {...PAGE_HERO_PRESETS.inline}
        title={t('hero.title')}
        subtitle={t('hero.bannerTagline')}
      />

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[{ label: t('breadcrumb.current') }]}
        className="bg-white border-b border-borderPrimary"
      />

      {/* Intro */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14 items-start">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-primaryColor mb-3">
              {t('hero.title')}
            </h2>
            <p className="text-base md:text-lg font-bold text-primaryColor mb-6 leading-snug">
              {t('hero.subtitle')}
            </p>
            <hr className="border-borderPrimary mb-6" />
            <div className="space-y-4 text-textPrimary text-sm md:text-base leading-relaxed">
              <p>{t('hero.description1')}</p>
              <p>{t('hero.description2')}</p>
              <p>{t('hero.description3')}</p>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/ai-lab/brain-core.png"
              alt={t('hero.imageAlt')}
              width={720}
              height={720}
              className="w-full max-w-md lg:max-w-lg h-auto rounded-2xl shadow-lg"
              priority
            />
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
        <div className="bg-bgAccent rounded-3xl px-6 py-10 md:px-10 md:py-12 shadow-sm border border-borderPrimary/50">
          <h2 className="text-xl md:text-2xl font-bold text-center text-textPrimary mb-10 md:mb-12">
            {t('challenges.title')}
            <span className="text-primaryColor">
              {t('challenges.titleHighlight')}
            </span>
            {locale === 'ja'
              ? t('challenges.titleEnd')
              : ` ${t('challenges.titleEnd')}`.trim()}
          </h2>

          <div className="space-y-0">
            {challenges.map((challenge, index) => (
              <div key={challenge.key}>
                <div className="grid md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-6 md:gap-10 items-center py-8 md:py-10">
                  <div className="flex justify-center md:justify-start order-1 md:order-none">
                    <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full overflow-hidden shadow-md ring-4 ring-white">
                      <Image
                        src={challenge.image}
                        alt={t(`challenges.${challenge.key}.imageAlt`)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 256px"
                      />
                    </div>
                  </div>
                  <div className="order-2 md:order-none text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                      <span className="inline-block px-3 py-1 bg-primaryColor text-white text-xs font-bold rounded-sm">
                        Case{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-base md:text-lg font-bold text-textPrimary">
                        {t(`challenges.${challenge.key}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm md:text-base text-textSecondary leading-relaxed">
                      {t(`challenges.${challenge.key}.description`)}
                    </p>
                  </div>
                </div>
                {index < challenges.length - 1 && (
                  <hr className="border-borderSecondary" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition */}
      <section className="text-center py-12 md:py-16 bg-white">
        <p className="text-lg md:text-2xl font-bold text-primaryColor leading-relaxed px-4">
          <span>{t('transition.cosbeName')}</span>
          {t('transition.text')}
        </p>
        <div className="mt-6 flex justify-center" aria-hidden>
          <span className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-primaryColor" />
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-gradient-to-b from-[#d4e8fa] via-[#e8f3fc] to-[#f4f9fe] pb-16 md:pb-20">
        <SectionWave className="text-white -mt-px" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14">
          <div className="mb-10 md:mb-12">
            <p className="text-primaryColor text-sm md:text-base font-medium mb-2">
              {t('features.sectionEyebrow')}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-primaryColor">
              <span>{t('features.titleBrand')}</span>
              <span className="text-textPrimary">
                {t('features.titleRest')}
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <article
                key={feature.key}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white"
              >
                <div className="flex justify-center mb-5">
                  <div className="relative w-40 h-40 md:w-44 md:h-44 rounded-full overflow-hidden ring-2 ring-primaryColor/20">
                    <Image
                      src={feature.image}
                      alt={t(`features.${feature.key}.imageAlt`)}
                      fill
                      className="object-cover"
                      sizes="176px"
                    />
                  </div>
                </div>
                <span className="inline-block px-2.5 py-0.5 bg-primaryColor text-white text-xs font-bold rounded-sm mb-3">
                  Case{String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-bold text-textPrimary mb-3 leading-snug">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-textSecondary leading-relaxed">
                  {t(`features.${feature.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-to-b from-[#7eb3e4] to-[#9ec6ea] py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 md:mb-12">
            <p className="text-white text-sm md:text-base font-medium mb-2">
              {t('benefits.sectionEyebrow')}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white">
              <span>{t('benefits.titleBrand')}</span>
              <span>{t('benefits.titleRest')}</span>
            </h2>
          </div>

          <div className="space-y-6 md:space-y-8">
            {benefits.map((benefit) => {
              const b = benefit.key;

              return (
                <GridPatternCard key={benefit.key}>
                  <div className="grid md:grid-cols-5 gap-0 items-stretch">
                    <div className="md:col-span-2 relative min-h-[220px] md:min-h-full order-1">
                      <Image
                        src={benefit.image}
                        alt={t(`benefits.${b}.imageAlt`)}
                        fill
                        className="object-cover rounded-t-2xl md:rounded-t-none md:rounded-l-3xl"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                    <div className="md:col-span-3 p-6 md:p-8 lg:p-10 order-2">
                      <h3 className="text-lg md:text-xl font-bold text-primaryColor mb-4 md:mb-5 leading-snug border-b border-primaryColor/30 pb-2">
                        {t(`benefits.${b}.title`)}
                      </h3>
                      <div className="space-y-3 text-sm md:text-base text-textPrimary leading-relaxed">
                        <p>{t(`benefits.${b}.point1`)}</p>
                        {b === 'benefit2' ? (
                          <p>
                            {t(`benefits.${b}.point2`)}
                            <span className="font-bold">
                              {t(`benefits.${b}.point2Bold`)}
                            </span>
                          </p>
                        ) : (
                          <p>{t(`benefits.${b}.point2`)}</p>
                        )}
                        <p>{t(`benefits.${b}.point3`)}</p>
                      </div>
                    </div>
                  </div>
                </GridPatternCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Agent + Pricing */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-primaryColor font-bold text-sm md:text-base mb-5">
            {t('aiAgentLink.text')}
          </p>
          <Link
            href="/ai-agent"
            className="inline-flex items-center justify-center min-w-[280px] md:min-w-[420px] px-10 py-3.5 bg-gradient-to-r from-primaryColor to-primaryLight text-white rounded-full font-bold text-sm md:text-base shadow-md hover:opacity-95 transition-opacity"
          >
            {t('aiAgentLink.button')} →
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-8">
          <Image
            src="/ai-lab/price-tag.png"
            alt=""
            width={120}
            height={80}
            className="w-24 md:w-32 h-auto"
            aria-hidden
          />
          <h2 className="text-xl md:text-2xl font-bold text-textPrimary leading-snug pb-1">
            {t('pricing.heading')}
          </h2>
        </div>

        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-bgAccent min-h-[280px]">
          <div className="relative z-10 max-w-xl p-6 md:p-10 lg:p-12">
            <h3 className="text-lg md:text-xl font-bold text-primaryColor mb-4 pb-2 border-b-2 border-primaryColor/30 inline-block">
              {t('pricing.cardTitle')}
            </h3>
            <div className="space-y-3 text-sm md:text-base text-textPrimary leading-relaxed mt-6">
              <p>{t('pricing.p1')}</p>
              <p>{t('pricing.p2')}</p>
              <p>{t('pricing.p3')}</p>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-full md:w-[55%] lg:w-[50%]">
            <Image
              src="/ai-lab/business-growth.png"
              alt={t('pricing.imageAlt')}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bgAccent via-bgAccent/80 to-transparent md:block hidden" />
          </div>
        </div>
      </section>

      {/* Price breakdown */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-20">
        <div className="mb-6">
          <span className="inline-block px-4 py-1.5 bg-primaryColor text-white text-sm font-bold rounded-sm">
            {t('priceBreakdown.badge')}
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-textPrimary leading-relaxed mb-8 whitespace-pre-line">
          {t('priceBreakdown.headline')}
        </h2>
        <PriceBreakdownCard />
      </section>

      {/* Comparison */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-20">
        <PricingComparisonTable />
      </section>

      {/* Case studies */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-16">
        <div className="bg-bgTertiary rounded-3xl p-8 lg:p-12">
          <h2 className="text-lg md:text-xl font-bold text-primaryColor mb-2">
            {t('caseStudies.subtitle')}
          </h2>
          <h3 className="text-xl md:text-2xl font-bold text-textPrimary mb-4">
            {t('caseStudies.title')}
          </h3>
          <p className="text-textSecondary text-sm md:text-base mb-10">
            {t('caseStudies.description')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {caseStudies.map((caseStudy) => (
              <article
                key={caseStudy.key}
                className="bg-white rounded-2xl overflow-hidden shadow-md"
              >
                <div className="relative h-44">
                  <Image
                    src={caseStudy.image}
                    alt={t(`caseStudies.${caseStudy.key}.imageAlt`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-primaryColor text-white text-xs font-semibold rounded-full">
                    {t(`caseStudies.${caseStudy.key}.category`)}
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-sm font-bold text-textPrimary mb-2 line-clamp-3 leading-snug">
                    {t(`caseStudies.${caseStudy.key}.title`)}
                  </h4>
                  <p className="text-xs text-textTertiary">
                    {t(`caseStudies.${caseStudy.key}.date`)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/case-studies"
              className="inline-block px-8 py-3 bg-primaryColor text-white rounded-full font-semibold hover:bg-primaryHover transition-colors"
            >
              {t('caseStudies.viewAll')} →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-primaryColor mb-8">
          {t('faq.title')}
        </h2>
        <div className="space-y-4">
          {(['q1', 'q2'] as const).map((q) => (
            <div
              key={q}
              className="border border-borderPrimary rounded-2xl p-6 bg-white"
            >
              <h3 className="text-base md:text-lg font-bold text-textPrimary mb-4 flex items-start gap-3">
                <span className="inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-error text-white text-sm font-bold">
                  Q
                </span>
                {t(`faq.${q}.question`)}
              </h3>
              <p className="text-textSecondary text-sm md:text-base leading-relaxed flex items-start gap-3">
                <span className="inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-primaryColor text-white text-sm font-bold">
                  A
                </span>
                <span>{t(`faq.${q}.answer`)}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <CtaSection
        title={t('finalCta.title')}
        description={t('finalCta.description')}
        additionalText={t('finalCta.additionalText')}
        buttonText={t('finalCta.button')}
        buttonHref="/contact"
      />
    </div>
  );
}

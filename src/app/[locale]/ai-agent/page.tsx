'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import Image from 'next/image';
import {
  Breadcrumb,
  PageHero,
  PAGE_HERO_PRESETS,
  ProcessFlow,
  type ProcessFlowStep,
  IndustryTabPanel,
  PriceBreakdownCard,
  PricingComparisonTable,
} from '@/components';

const INDUSTRY_IMAGES = {
  construction: '/ai-agent/industry-construction.jpg',
  retail: '/ai-agent/industry-retail.jpg',
  manufacturing: '/ai-agent/industry-manufacturing.jpg',
} as const;

type IndustryKey = keyof typeof INDUSTRY_IMAGES;

export default function AiAgentPage() {
  const t = useTranslations('aiAgent');
  const [activeTab, setActiveTab] = useState<
    'construction' | 'retail' | 'manufacturing'
  >('construction');

  const iconClass = 'h-10 w-10 text-primaryColor';

  const processSteps: ProcessFlowStep[] = [
    {
      badge: t('process.step1.number'),
      title: t('process.step1.title'),
      description: t('process.step1.description'),
      icon: (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      badge: t('process.step2.number'),
      title: t('process.step2.title'),
      description: t('process.step2.description'),
      icon: (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      badge: t('process.step3.number'),
      title: t('process.step3.title'),
      description: t('process.step3.description'),
      icon: (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      ),
    },
    {
      badge: t('process.step4.number'),
      title: t('process.step4.title'),
      description: t('process.step4.description'),
      icon: (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        {...PAGE_HERO_PRESETS.centered}
        title={t('heroTitle')}
        subtitle={t('subtitle')}
      />

      <Breadcrumb
        homeLabel={t('breadcrumb.home')}
        items={[
          { label: t('breadcrumb.aiLab'), href: '/ai-lab' },
          { label: t('breadcrumb.current') },
        ]}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-5xl md:text-6xl font-bold text-primaryLight leading-tight">
                {t('title')}
              </h2>

              <p className="text-2xl md:text-3xl text-primaryLight leading-relaxed font-light">
                {t('subtitle')}
              </p>

              <div className="h-px bg-borderSecondary my-8"></div>

              <div className="space-y-6 text-textSecondary">
                <p className="text-lg leading-relaxed">{t('intro1')}</p>

                <p className="text-lg leading-relaxed font-medium">
                  {t('intro2')}
                </p>

                <p className="text-lg leading-relaxed">
                  {t('agentDescription')}
                </p>

                <p className="text-lg leading-relaxed">{t('agentDetail1')}</p>

                <p className="text-lg leading-relaxed">{t('agentDetail2')}</p>
              </div>
            </div>

            <div className="relative lg:ml-8">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                {/* Hero Image */}
                <Image
                  src="/ai-agent/hero-banner.jpg"
                  alt="AI Agent Visual"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Problems Section */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto bg-bgSecondary rounded-3xl shadow-lg p-10 md:p-16">
            <h3 className="text-3xl md:text-4xl font-bold text-center text-textPrimary mb-12">
              {t('problems.title')}
            </h3>
            <ul className="space-y-6 mb-12">
              <li className="flex items-start gap-4">
                <span className="text-textPrimary mt-1.5 text-xl font-bold">
                  •
                </span>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('problems.item1')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-textPrimary mt-1.5 text-xl font-bold">
                  •
                </span>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('problems.item2')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-textPrimary mt-1.5 text-xl font-bold">
                  •
                </span>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('problems.item3')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-textPrimary mt-1.5 text-xl font-bold">
                  •
                </span>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('problems.item4')}
                </p>
              </li>
            </ul>

            {/* CTA Button */}
            <div className="text-center">
              <Link
                href="/contact"
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-12 py-5 bg-primaryColor text-white rounded-full hover:bg-primaryHover transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl"
              >
                {t('ctaConsult')}
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* What is AI Agent Section */}
        <section className="py-20 bg-bgSecondary -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-textTertiary text-base">
                {t('whatIs.badge')}
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-primaryLight mb-8">
              {t('whatIs.title')}
            </h2>

            <h3 className="text-2xl md:text-3xl font-semibold text-textPrimary mb-10 leading-relaxed">
              {t('whatIs.subtitle')}
            </h3>

            <ul className="space-y-5 mb-16 max-w-5xl">
              <li className="flex items-start gap-4">
                <svg
                  className="w-6 h-6 text-primaryColor mt-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('whatIs.point1')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <svg
                  className="w-6 h-6 text-primaryColor mt-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-textSecondary text-lg leading-relaxed">
                  {t('whatIs.point2')}
                </p>
              </li>
            </ul>

            <ProcessFlow steps={processSteps} />

            {/* Industry Examples with Tabs */}
            <div className="mt-20">
              <h3 className="mb-6 text-3xl font-bold text-textPrimary md:text-4xl">
                {t('industries.title')}
              </h3>
              <p className="mb-10 max-w-5xl text-lg leading-relaxed text-textSecondary">
                {t('industries.description')}
              </p>

              <div className="overflow-hidden rounded-lg border-2 border-borderPrimary bg-white">
                <div
                  className="flex"
                  role="tablist"
                  aria-label={t('industries.title')}
                >
                  {(
                    [
                      'construction',
                      'retail',
                      'manufacturing',
                    ] as const satisfies readonly IndustryKey[]
                  ).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-4 text-center text-base font-semibold transition-colors md:text-lg ${
                        activeTab === tab
                          ? 'bg-borderDark text-white'
                          : 'bg-bgTertiary text-textTertiary hover:bg-borderPrimary/30'
                      }`}
                    >
                      {t(`industries.${tab}.title`)}
                    </button>
                  ))}
                </div>

                <div className="p-6 md:p-10" role="tabpanel">
                  <IndustryTabPanel
                    title={t(`industries.${activeTab}.title`)}
                    imageSrc={INDUSTRY_IMAGES[activeTab]}
                    imageAlt={t(`industries.${activeTab}.title`)}
                    problemTitle={t(`industries.${activeTab}.problemTitle`)}
                    problem1={t(`industries.${activeTab}.problem1`)}
                    problem2={t(`industries.${activeTab}.problem2`)}
                    solutionTitle={t(`industries.${activeTab}.solutionTitle`)}
                    solution1={t(`industries.${activeTab}.solution1`)}
                    solution2={t(`industries.${activeTab}.solution2`)}
                    benefitTitle={t(`industries.${activeTab}.benefitTitle`)}
                    benefit1={t(`industries.${activeTab}.benefit1`)}
                    benefit2={t(`industries.${activeTab}.benefit2`)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-6 bg-primaryColor rounded flex items-center justify-center text-white font-bold text-xs">
              AI
            </div>
            <span className="text-textTertiary text-sm">
              {t('features.badge')}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-primaryColor mb-4">
            {t('features.title')}
          </h2>
          <p className="text-textSecondary mb-8">{t('features.subtitle')}</p>

          <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
            <Image
              src="/ai-agent/integration-service.jpeg"
              alt="AI Agent Features"
              width={1200}
              height={500}
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-surface-tertiary">
              <h4 className="font-bold text-textPrimary mb-3">
                {t('features.feature1.title')}
              </h4>
              <hr className="border-borderPrimary mb-3" />
              <p className="text-textTertiary text-sm mb-4">
                {t('features.feature1.description')}
              </p>
              <p className="text-sm font-medium text-textSecondary">
                {t('features.feature1.benefit')}
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-textTertiary">
                  • {t('features.feature1.point1')}
                </li>
                <li className="text-sm text-textTertiary">
                  • {t('features.feature1.point2')}
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-surface-tertiary">
              <h4 className="font-bold text-textPrimary mb-3">
                {t('features.feature2.title')}
              </h4>
              <hr className="border-borderPrimary mb-3" />
              <p className="text-textTertiary text-sm mb-4">
                {t('features.feature2.description')}
              </p>
              <p className="text-sm font-medium text-textSecondary">
                {t('features.feature2.benefit')}
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-textTertiary">
                  • {t('features.feature2.point1')}
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-surface-tertiary">
              <h4 className="font-bold text-textPrimary mb-3">
                {t('features.feature3.title')}
              </h4>
              <hr className="border-borderPrimary mb-3" />
              <p className="text-textTertiary text-sm mb-4">
                {t('features.feature3.description')}
              </p>
              <p className="text-sm font-medium text-textSecondary">
                {t('features.feature3.benefit')}
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-textTertiary">
                  • {t('features.feature3.point1')}
                </li>
                <li className="text-sm text-textTertiary">
                  • {t('features.feature3.point2')}
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-surface-tertiary">
              <h4 className="font-bold text-textPrimary mb-3">
                {t('features.feature4.title')}
              </h4>
              <hr className="border-borderPrimary mb-3" />
              <p className="text-textTertiary text-sm mb-4">
                {t('features.feature4.description')}
              </p>
              <p className="text-sm font-medium text-textSecondary">
                {t('features.feature4.benefit')}
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-textTertiary">
                  • {t('features.feature4.point1')}
                </li>
                <li className="text-sm text-textTertiary">
                  • {t('features.feature4.point2')}
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primaryColor text-white rounded-full hover:bg-primaryHover hover:shadow-lg transition-all duration-200 text-lg font-semibold"
            >
              {t('ctaConsult')}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </section>

        {/* Pricing — reuses aiLabPage.priceBreakdown + comparison */}
        <section className="py-16">
          <div className="mb-6">
            <span className="inline-block rounded-sm bg-primaryColor px-4 py-1.5 text-sm font-bold text-white">
              {t('pricing.badge')}
            </span>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-primaryColor md:text-3xl">
            {t('pricing.title')}
          </h2>
          <p className="mb-8 max-w-4xl text-base leading-relaxed text-textSecondary md:text-lg">
            {t('pricing.description')}
          </p>
          <div className="mb-12 max-w-4xl">
            <PriceBreakdownCard />
          </div>
          <PricingComparisonTable showIntro={false} />
        </section>

        {/* Deployment Process Section */}
        <section className="py-16 bg-bgSecondary/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-6 bg-primaryColor rounded flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <span className="text-textTertiary text-sm">
                {t('deployment.badge')}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-primaryColor mb-6">
              {t('deployment.title')}
            </h2>
            <p className="text-textSecondary mb-4">
              {t('deployment.description1')}
            </p>
            <p className="text-textSecondary mb-4">
              {t('deployment.description2')}
            </p>
            <p className="text-textSecondary mb-8">
              {t('deployment.description3')}
            </p>

            {/* Deployment Flow Diagram */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <Image
                src="/ai-agent/flow.jpg"
                alt="Deployment Flow"
                width={1200}
                height={400}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-6 bg-primaryColor rounded flex items-center justify-center text-white font-bold text-xs">
                AI
              </div>
              <span className="text-textTertiary text-sm">
                {t('faq.badge')}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-primaryColor mb-8">
              {t('faq.title')}
            </h2>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <details
                  key={num}
                  className="bg-white rounded-xl shadow-lg overflow-hidden group"
                >
                  <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-bgSecondary">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-error text-white rounded-full flex items-center justify-center font-bold text-sm">
                        Q
                      </span>
                      <span className="font-medium text-textPrimary">
                        {t(`faq.q${num}`)}
                      </span>
                    </div>
                    <svg
                      className="w-5 h-5 text-textTertiary transform group-open:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-6 pb-4">
                    <div className="flex items-start gap-4 pt-4 border-t border-surface-tertiary">
                      <span className="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                        A
                      </span>
                      <p className="text-textSecondary">{t(`faq.a${num}`)}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Final CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_image.jpeg')" }}
        ></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 whitespace-pre-line">
            {t('finalCta.title')}
          </h2>
          <p className="text-white/80 mb-2 text-base">
            {t('finalCta.description1')}
          </p>
          <p className="text-white/80 mb-10 text-base">
            {t('finalCta.description2')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('finalCta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}

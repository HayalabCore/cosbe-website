'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';

export default function AiLabPage() {
  const t = useTranslations('aiLabPage');
  const locale = useLocale();

  const challenges = [
    { key: 'challenge1', image: '/ai-lab/challenge1.webp' },
    { key: 'challenge2', image: '/ai-lab/challenge2.webp' },
    { key: 'challenge3', image: '/ai-lab/challenge3.webp' },
  ];

  const features = [
    { key: 'feature1', image: '/ai-lab/feature1.webp' },
    { key: 'feature2', image: '/ai-lab/feature2.jpeg' },
    { key: 'feature3', image: '/ai-lab/feature3.jpeg' },
  ];

  const caseStudies = [
    { key: 'case1', image: '/ai-lab/training-agent.png' },
    { key: 'case2', image: '/ai-lab/new-business-2months.png' },
    { key: 'case3', image: '/ai-lab/resume-from-en.png' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center bg-white rounded-3xl p-8 lg:p-12">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#5FA4E6] mb-4 pb-3 border-b-2 border-[#5FA4E6]">
                {t('hero.title')}
              </h2>
              <p className="text-sm text-[#5FA4E6] font-semibold mb-2">
                {t('hero.subtitle')}
              </p>
              <hr className="my-4 border-gray-200" />
              <p className="text-gray-800 text-base leading-relaxed mb-4">
                {t('hero.description1')}
              </p>
              <p className="text-gray-800 text-base leading-relaxed mb-4">
                {t('hero.description2')}
              </p>
              <p className="text-gray-800 text-base leading-relaxed">
                {t('hero.description3')}
              </p>
            </div>
            <div className="flex justify-center">
              <div className="relative w-full max-w-md">
                <Image
                  src="/ai-lab/brain-core.png"
                  alt={t('hero.imageAlt')}
                  width={988}
                  height={988}
                  className="w-full h-auto rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Challenges Section */}
        <section className="mb-16">
          <div className="bg-[var(--color-brand-alt)] rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-10">
              {t('challenges.title')} <span className="text-[#5FA4E6]">{t('challenges.titleHighlight')}</span>{locale === 'ja' && t('challenges.titleEnd')}
            </h2>
            
            <div className="space-y-8">
              {challenges.map((challenge, index) => (
                <div key={challenge.key} className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-block px-4 py-1.5 bg-[#5FA4E6] text-white text-sm font-bold rounded">
                        Case{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {t(`challenges.${challenge.key}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {t(`challenges.${challenge.key}.description`)}
                    </p>
                    <hr className="border-gray-300" />
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-40 h-40 rounded-full overflow-hidden shadow-lg">
                      <Image
                        src={challenge.image}
                        alt={t(`challenges.${challenge.key}.imageAlt`)}
                        width={160}
                        height={160}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Transition Section */}
        <section className="mb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#5FA4E6]/5 to-[#5FA4E6]/20" />
          <div className="relative py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              <span className="text-[#5FA4E6]">{t('transition.cosbeName')}</span>
              {t('transition.text')}
            </h2>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-[#7AB5ED] to-[#5FA4E6] rounded-2xl py-8 px-8 lg:px-12 mb-10 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              {t('features.title')}
            </h2>
          </div>
          
          <div className="bg-gradient-to-b from-[#5FA4E6]/10 to-white rounded-3xl p-8 lg:p-12">

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={feature.key} className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-[var(--color-brand-blue)]">
                <div className="flex justify-center mb-6">
                  <div className="w-48 h-48 rounded-full overflow-hidden">
                    <Image
                      src={feature.image}
                      alt={t(`features.${feature.key}.imageAlt`)}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-[#5FA4E6] text-white text-sm font-bold rounded">
                    Case {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  {t(`features.${feature.key}.title`)}
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {t(`features.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-16 bg-gradient-to-br from-[#5FA4E6] to-[#5FA4E6] rounded-3xl p-8 lg:p-12 text-white">
          <div className="mb-8">
            <p className="text-sm mb-2 opacity-90">{locale === 'ja' ? 'メリット' : 'Benefits of'}</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
              {t('benefits.title')}
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white/95 rounded-3xl p-6 lg:p-8 grid md:grid-cols-[2fr_1fr] gap-6 items-start">
              <div className="text-gray-900">
                <h4 className="text-lg font-bold text-[#5FA4E6] mb-4">
                  {t('benefits.benefit1.title')}
                </h4>
                <p className="text-sm leading-relaxed mb-3">
                  {t('benefits.benefit1.point1')}
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  {t('benefits.benefit1.point2')}
                </p>
                <p className="text-sm leading-relaxed font-bold">
                  {t('benefits.benefit1.point3')}
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <Image
                  src="/ai-lab/benefit1.jpg"
                  alt={t('benefits.benefit1.imageAlt')}
                  width={300}
                  height={225}
                  className="w-full max-w-[200px] md:max-w-[250px] h-auto rounded-2xl"
                />
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 lg:p-8 grid md:grid-cols-[2fr_1fr] gap-6 items-start">
              <div className="text-gray-900">
                <h4 className="text-lg font-bold text-[#5FA4E6] mb-4">
                  {t('benefits.benefit2.title')}
                </h4>
                <p className="text-sm leading-relaxed mb-3">
                  {t('benefits.benefit2.point1')}
                </p>
                <p className="text-sm leading-relaxed mb-1">
                  {t('benefits.benefit2.point2')}
                </p>
                <p className="text-sm leading-relaxed mb-3 font-bold">
                  {t('benefits.benefit2.point2Bold')}
                </p>
                <p className="text-sm leading-relaxed">
                  {t('benefits.benefit2.point3')}
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <Image
                  src="/ai-lab/benefit2.jpg"
                  alt={t('benefits.benefit2.imageAlt')}
                  width={300}
                  height={225}
                  className="w-full max-w-[200px] md:max-w-[250px] h-auto rounded-2xl"
                />
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 lg:p-8 grid md:grid-cols-[2fr_1fr] gap-6 items-start">
              <div className="text-gray-900">
                <h4 className="text-lg font-bold text-[#5FA4E6] mb-4">
                  {t('benefits.benefit3.title')}
                </h4>
                <p className="text-sm leading-relaxed mb-3">
                  {t('benefits.benefit3.point1')}
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  {t('benefits.benefit3.point2')}
                </p>
                <p className="text-sm leading-relaxed font-bold">
                  {t('benefits.benefit3.point3')}
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <Image
                  src="/ai-lab/benefit3.jpg"
                  alt={t('benefits.benefit3.imageAlt')}
                  width={300}
                  height={225}
                  className="w-full max-w-[200px] md:max-w-[250px] h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* AI Agent Link */}
        <section className="mb-16 text-center">
          <p className="text-[#5FA4E6] font-bold mb-4">
            {t('aiAgentLink.text')}
          </p>
          <Link
            href="/ai-agent"
            className="inline-block px-8 py-3 bg-[#5FA4E6] border border-[#5FA4E6] text-white rounded-full font-semibold hover:bg-[#4A8FD1] hover:border-[#4A8FD1] transition-colors"
          >
            {t('aiAgentLink.button')} →
          </Link>
        </section>

        {/* Pricing Section */}
        <section className="mb-16">
          <div className="mb-8">
            <div className="inline-block mb-4">
              <Image
                src="/ai-lab/price-tag.png"
                alt="Price"
                width={200}
                height={108}
                className="h-16 md:h-20 w-auto"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {t('pricing.title')}
            </h2>
          </div>

          <div className="relative mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0">
              {/* Image Container - Behind on desktop */}
              <div className="w-full md:w-[60%] md:ml-auto order-2 md:order-1">
                <Image
                  src="/ai-lab/business-growth.png"
                  alt={t('pricing.lowPrice.imageAlt')}
                  width={560}
                  height={360}
                  className="w-full h-auto rounded-2xl"
                />
              </div>
              
              {/* Text Card - Overlays on desktop */}
              <div className="w-full md:w-auto md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:z-10 order-1 md:order-2">
                <div className="bg-white rounded-2xl shadow-lg border border-[#5FA4E6]/20 p-6 md:p-8 md:max-w-[480px]">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                    {t('pricing.lowPrice.title')}
                  </h3>
                  <div className="h-px bg-[#5FA4E6]/40 mb-4" />
                  <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                    {t('pricing.lowPrice.point1')}
                  </p>
                  <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                    {t('pricing.lowPrice.point2')}
                  </p>
                  <p className="text-sm md:text-base text-gray-800 font-bold">
                    {t('pricing.lowPrice.point3')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
              {t('pricing.table.title')}
            </h3>

            <div className="border-2 border-[#7AB5ED] rounded-2xl p-6 mb-8">
              <p className="text-lg md:text-xl font-bold text-[#5FA4E6] mb-2">
                {t('pricing.amount.development')}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {t('pricing.amount.developmentNote')}
              </p>
              <p className="text-lg md:text-xl font-bold text-orange-600 mb-2">
                {t('pricing.amount.maintenance')}
              </p>
              <p className="text-sm text-gray-600">
                {t('pricing.amount.maintenanceNote')}
              </p>
            </div>

            <div className="mb-6">
              <div className="inline-block px-6 py-2 bg-[#5FA4E6] text-white text-sm font-bold rounded mb-4">
                {t('pricing.comparison.title')}
              </div>
              <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                {t('pricing.comparison.subtitle')}
              </h4>
              <p className="text-gray-700 mb-2">{t('pricing.comparison.text1')}</p>
              <p className="text-gray-700 mb-2">{t('pricing.comparison.text2')}</p>
              <p className="text-gray-800 font-bold">{t('pricing.comparison.text3')}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-[#5FA4E6]/10 rounded-2xl overflow-hidden">
                <thead className="bg-[#5FA4E6] text-white">
                  <tr>
                    <th className="p-4 text-left"></th>
                    <th className="p-4 text-center font-bold">CosBE</th>
                    <th className="p-4 text-center font-bold">{t('pricing.comparison.companyA')}</th>
                    <th className="p-4 text-center font-bold">{t('pricing.comparison.companyB')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-[#5FA4E6]/30">
                    <td className="p-4 font-semibold">{t('pricing.comparison.agile')}</td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-green-400 rounded-full" />
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-green-400 rounded-full" />
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-green-400 rounded-full" />
                    </td>
                  </tr>
                  <tr className="border-b border-[#5FA4E6]/30">
                    <td className="p-4 font-semibold">{t('pricing.comparison.consulting')}</td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-green-400 rounded-full" />
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-red-400 rounded-full">✕</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-red-400 rounded-full">✕</span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#5FA4E6]/30">
                    <td className="p-4 font-semibold">{t('pricing.comparison.serverTools')}</td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-green-400 rounded-full" />
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-red-400 rounded-full">✕</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block w-6 h-6 bg-red-400 rounded-full">✕</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">{t('pricing.comparison.price')}</td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.comparison.cosbePrice')}</p>
                      <p className="text-xs text-gray-600">{t('pricing.comparison.cosbeNote')}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.comparison.companyAPrice')}</p>
                      <p className="text-xs text-gray-600">{t('pricing.comparison.companyANote')}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.comparison.companyBPrice')}</p>
                      <p className="text-xs text-gray-600">{t('pricing.comparison.companyBNote')}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Case Studies Section */}
        <section className="mb-16 bg-gray-100 rounded-3xl p-8 lg:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#5FA4E6] mb-2">
            {t('caseStudies.subtitle')}
          </h2>
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {t('caseStudies.title')}
          </h3>
          <p className="text-gray-700 mb-10">
            {t('caseStudies.description')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {caseStudies.map((caseStudy) => (
              <div key={caseStudy.key} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <div className="relative h-48">
                  <Image
                    src={caseStudy.image}
                    alt={t(`caseStudies.${caseStudy.key}.imageAlt`)}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-[#5FA4E6] text-white text-xs font-semibold rounded-full">
                      {t(`caseStudies.${caseStudy.key}.category`)}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
                    {t(`caseStudies.${caseStudy.key}.title`)}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t(`caseStudies.${caseStudy.key}.date`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/case-studies"
              className="inline-block px-8 py-3 bg-[#5FA4E6] text-white rounded-full font-semibold hover:bg-[#4A8FD1] hover:shadow-lg transition-all"
            >
              {t('caseStudies.viewAll')} →
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-[#5FA4E6] mb-8">
            {t('faq.title')}
          </h2>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start">
                <span className="inline-block w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0">Q</span>
                {t('faq.q1.question')}
              </h4>
              <p className="text-gray-700 ml-11">
                <span className="inline-block w-8 h-8 bg-[#5FA4E6] text-white rounded-full flex items-center justify-center mr-3 mb-2">A</span>
                {t('faq.q1.answer')}
              </p>
            </div>

            <div className="border border-gray-200 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start">
                <span className="inline-block w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0">Q</span>
                {t('faq.q2.question')}
              </h4>
              <p className="text-gray-700 ml-11">
                <span className="inline-block w-8 h-8 bg-[#5FA4E6] text-white rounded-full flex items-center justify-center mr-3 mb-2">A</span>
                {t('faq.q2.answer')}
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Final CTA Section */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
              {t('finalCta.title')}
            </h2>
            <p className="text-white/90 mb-2 text-base">
              {t('finalCta.subtitle')}
            </p>
            <p className="text-white/80 mb-2 text-sm max-w-2xl mx-auto">
              {t('finalCta.description')}
            </p>
            <p className="text-white/80 mb-10 text-sm max-w-2xl mx-auto">
              {t('finalCta.additionalText')}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-[#5FA4E6] text-white rounded-full font-bold text-lg hover:bg-[#7AB5ED] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('finalCta.button')}
            </Link>
        </div>
      </section>
    </div>
  );
}

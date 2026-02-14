'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export default function AiTransformationPage() {
  const t = useTranslations('aiTransformationPage');

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm text-textTertiary">
          <span className="hover:text-primaryColor cursor-pointer">□ Home</span>
          <span className="mx-2">›</span>
          <span>{t('breadcrumb')}</span>
        </div>

        {/* CosBE's Strengths Heading */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-textPrimary inline-block pb-2 border-b-2 border-primaryColor">
            {t('strengths.title')}
          </h2>
        </div>

        {/* Main Content Section */}
        <div className="bg-bgSecondary rounded-lg p-8 md:p-12 mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-textPrimary mb-6 text-center">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-textSecondary text-center leading-relaxed max-w-4xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Section 1 - Image Left, Text Right */}
        <div className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 bg-gradient-to-br from-primaryColor/20 to-primaryColor/10 rounded-2xl overflow-hidden">
              <Image
                src="/ai-transformation/vision1.png"
                alt={t('section1.imageAlt')}
                fill
                className="object-contain p-8"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-textPrimary mb-6 border-l-4 border-primaryColor pl-4">
                {t('section1.title')}
              </h2>
              <p className="text-textSecondary mb-6 leading-relaxed">
                {t('section1.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section1.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section1.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section1.point3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2 - Text Left, Image Right */}
        <div className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-textPrimary mb-6 border-l-4 border-primaryColor pl-4">
                {t('section2.title')}
              </h2>
              <p className="text-textSecondary mb-6 leading-relaxed">
                {t('section2.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section2.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section2.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section2.point3')}</span>
                </li>
              </ul>
            </div>
            <div className="relative h-80 bg-gradient-to-br from-primaryColor/20 to-primaryColor/10 rounded-2xl overflow-hidden">
              <Image
                src="/ai-transformation/vision2.png"
                alt={t('section2.imageAlt')}
                fill
                className="object-contain p-8"
              />
            </div>
          </div>
        </div>

        {/* Section 3 - Image Left, Text Right */}
        <div className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 bg-gradient-to-br from-primaryColor/20 to-primaryColor/10 rounded-2xl overflow-hidden">
              <Image
                src="/ai-transformation/vision3.png"
                alt={t('section3.imageAlt')}
                fill
                className="object-contain p-8"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-textPrimary mb-6 border-l-4 border-primaryColor pl-4">
                {t('section3.title')}
              </h2>
              <p className="text-textSecondary mb-6 leading-relaxed">
                {t('section3.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section3.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section3.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primaryColor mr-3 mt-1">●</span>
                  <span className="text-textSecondary">{t('section3.point3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto mb-16 bg-white rounded-2xl p-8 md:p-12 shadow-lg border-l-4 border-primaryColor">
          <h2 className="text-2xl md:text-3xl font-bold text-textPrimary mb-6 text-center">
            {t('info.title')}
          </h2>
          <p className="text-textSecondary leading-relaxed text-center mb-8">
            {t('info.description')}
          </p>
          <div className="text-center">
            <Link
              href="/download"
              className="inline-block px-8 py-4 bg-primaryColor text-white rounded-full font-semibold hover:bg-primaryColor transition-colors shadow-md hover:shadow-lg"
            >
              {t('info.button')}
            </Link>
          </div>
        </div>

      </div>

      {/* CTA Section 2 */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/bg_image.jpeg')" }}></div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 whitespace-pre-line">
              {t('cta2.title')}
            </h2>
            <p className="text-white/90 mb-2 text-lg">
              {t('cta2.subtitle')}
            </p>
            <p className="text-white/80 mb-2 text-base max-w-2xl mx-auto">
              {t('cta2.description')}
            </p>
            <p className="text-white/80 mb-10 text-base max-w-2xl mx-auto">
              {t('cta2.additionalText')}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-3 w-full max-w-2xl mx-auto px-12 py-5 bg-primaryColor text-white rounded-full font-bold text-lg hover:bg-primaryLight transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('cta2.button')}
            </Link>
        </div>
      </section>
    </div>
  );
}

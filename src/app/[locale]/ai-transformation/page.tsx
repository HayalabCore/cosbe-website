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
        <div className="mb-8 text-sm text-gray-600">
          <span className="hover:text-blue-600 cursor-pointer">□ Home</span>
          <span className="mx-2">›</span>
          <span>{t('breadcrumb')}</span>
        </div>

        {/* CosBE's Strengths Heading */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 inline-block pb-2 border-b-2 border-blue-500">
            {t('strengths.title')}
          </h2>
        </div>

        {/* Main Content Section */}
        <div className="bg-gray-50 rounded-lg p-8 md:p-12 mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            {t('title')}
          </h1>
          <p className="text-base md:text-lg text-gray-700 text-center leading-relaxed max-w-4xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Section 1 - Image Left, Text Right */}
        <div className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden">
              <Image
                src="/ai-transformation/vision1.png"
                alt={t('section1.imageAlt')}
                fill
                className="object-contain p-8"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-4">
                {t('section1.title')}
              </h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('section1.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section1.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section1.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section1.point3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2 - Text Left, Image Right */}
        <div className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-4">
                {t('section2.title')}
              </h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('section2.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section2.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section2.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section2.point3')}</span>
                </li>
              </ul>
            </div>
            <div className="relative h-80 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden">
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
            <div className="relative h-80 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl overflow-hidden">
              <Image
                src="/ai-transformation/vision3.png"
                alt={t('section3.imageAlt')}
                fill
                className="object-contain p-8"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-4">
                {t('section3.title')}
              </h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t('section3.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section3.point1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section3.point2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">●</span>
                  <span className="text-gray-700">{t('section3.point3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto mb-16 bg-white rounded-2xl p-8 md:p-12 shadow-lg border-l-4 border-blue-500">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            {t('info.title')}
          </h2>
          <p className="text-gray-700 leading-relaxed text-center mb-8">
            {t('info.description')}
          </p>
          <div className="text-center">
            <Link
              href="/download"
              className="inline-block px-8 py-4 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              {t('info.button')}
            </Link>
          </div>
        </div>

        {/* CTA Section 2 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta2.title')}
          </h2>
          <p className="text-lg mb-4 opacity-90">
            {t('cta2.subtitle')}
          </p>
          <p className="text-base mb-4 opacity-80 max-w-2xl mx-auto">
            {t('cta2.description')}
          </p>
          <p className="text-base mb-8 opacity-80 max-w-2xl mx-auto">
            {t('cta2.additionalText')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('cta2.button')}
          </Link>
        </div>
      </div>
    </div>
  );
}

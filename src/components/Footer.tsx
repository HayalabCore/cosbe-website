'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-white border-t border-gray-200 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo and Tagline */}
          <div className="flex flex-col items-center md:items-start">
            <div className="mb-4">
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="CosBE Logo"
                  width={150}
                  height={50}
                  className="h-12 w-auto"
                />
              </Link>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              {t('tagline')}
            </p>
          </div>

          {/* Navigation Links - Column 1 */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link href="/ai-transformation" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('businessContent')}
                </Link>
              </li>
              <li>
                <Link href="/company" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('companyProfile')}
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('caseStudies')}
                </Link>
              </li>
              <li>
                <Link href="/useful-info" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('usefulColumn')}
                </Link>
              </li>
              <li>
                <Link href="/notice" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('announcement')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Links - Column 2 */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('homePage')}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2">▸</span>
                  {t('inquiry')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center md:text-left mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">CosBE Incorporated</h3>
            <p className="text-sm text-gray-600">
              3 East Third Ave, San Mateo, CA, United States of America
            </p>
          </div>
          
          {/* Copyright */}
          <div className="text-center text-sm text-gray-600">
            {t('copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
}

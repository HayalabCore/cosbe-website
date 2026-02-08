'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Footer() {
  const t = useTranslations('footer');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-gray-200 py-12 mt-16 relative">
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
              <span className="text-gray-600">The </span>
              <span className="text-blue-600">Cos</span>
              <span className="text-gray-600">mopolitan </span>
              <span className="text-blue-600">B</span>
              <span className="text-gray-600">usiness </span>
              <span className="text-blue-600">E</span>
              <span className="text-gray-600">ngine</span>
            </p>
          </div>

          {/* Navigation Links - Column 1 */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link href="/ai-lab" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('businessContent')}
                </Link>
              </li>
              <li>
                <Link href="/company" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('companyProfile')}
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('caseStudies')}
                </Link>
              </li>
              <li>
                <Link href="/useful-column" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('usefulColumn')}
                </Link>
              </li>
              <li>
                <Link href="/notice" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
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
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('homePage')}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-700 hover:text-blue-600 text-sm flex items-center">
                  <span className="mr-2 text-blue-600">▸</span>
                  {t('inquiry')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center md:text-left mb-4">
            <h3 className="text-lg font-semibold text-blue-600 mb-2">CosBE Incorporated</h3>
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-14 h-14 bg-white border-2 border-blue-500 rounded-full shadow-lg flex flex-col items-center justify-center hover:bg-blue-50 transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <svg 
            className="w-4 h-4 text-blue-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-xs font-semibold text-blue-500 mt-0.5">TOP</span>
        </button>
      )}
    </footer>
  );
}

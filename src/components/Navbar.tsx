'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';
import { useState } from 'react';

export default function Navbar() {
  const t = useTranslations('navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiTransformationOpen, setAiTransformationOpen] = useState(false);
  const [usefulInfoOpen, setUsefulInfoOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);
  const [aiTransformationTimeout, setAiTransformationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [usefulInfoTimeout, setUsefulInfoTimeout] = useState<NodeJS.Timeout | null>(null);

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setMobileMenuOpen(false);
  };

  const handleAiTransformationEnter = () => {
    if (aiTransformationTimeout) {
      clearTimeout(aiTransformationTimeout);
      setAiTransformationTimeout(null);
    }
    setAiTransformationOpen(true);
  };

  const handleAiTransformationLeave = () => {
    const timeout = setTimeout(() => {
      setAiTransformationOpen(false);
    }, 200);
    setAiTransformationTimeout(timeout);
  };

  const handleUsefulInfoEnter = () => {
    if (usefulInfoTimeout) {
      clearTimeout(usefulInfoTimeout);
      setUsefulInfoTimeout(null);
    }
    setUsefulInfoOpen(true);
  };

  const handleUsefulInfoLeave = () => {
    const timeout = setTimeout(() => {
      setUsefulInfoOpen(false);
    }, 200);
    setUsefulInfoTimeout(timeout);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center z-50">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={120}
              height={40}
              className="h-7 w-auto md:h-7.5 lg:h-8"
            />
          </Link>

          {/* Desktop/Tablet Navigation */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
              {/* 1. Company Overview */}
              <Link
                href="/company"
                className="text-[var(--color-brand-heading)] hover:text-[var(--color-brand-blue)] transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap"
              >
                {t('companyOverview')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-brand-blue)] transition-all duration-200 group-hover:w-full"></span>
              </Link>

              {/* 2. AI Transformation - Dropdown */}
              <div 
                className="relative"
                onMouseEnter={handleAiTransformationEnter}
                onMouseLeave={handleAiTransformationLeave}
              >
                <button className="text-[var(--color-brand-heading)] hover:text-[var(--color-brand-blue)] transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap flex items-center gap-1">
                  {t('aiTransformation')}
                  <svg className={`w-4 h-4 transition-transform duration-200 ${aiTransformationOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-brand-blue)] transition-all duration-200 group-hover:w-full"></span>
                </button>
                {aiTransformationOpen && (
                  <div className="absolute top-full left-0 mt-1 pt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/ai-transformation"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setAiTransformationOpen(false)}
                    >
                      {t('cosbeAiTransformation')}
                    </Link>
                    <Link
                      href="/ai-lab"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setAiTransformationOpen(false)}
                    >
                      {t('fastAiLab')}
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. AI Partner Recruitment */}
              <Link
                href="/recruit"
                className="text-[var(--color-brand-heading)] hover:text-[var(--color-brand-blue)] transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap"
              >
                {t('aiPartnerRecruitment')}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-brand-blue)] transition-all duration-200 group-hover:w-full"></span>
              </Link>

              {/* 4. Useful Information - Dropdown */}
              <div 
                className="relative"
                onMouseEnter={handleUsefulInfoEnter}
                onMouseLeave={handleUsefulInfoLeave}
              >
                <button className="text-[var(--color-brand-heading)] hover:text-[var(--color-brand-blue)] transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap flex items-center gap-1">
                  {t('usefulInfo')}
                  <svg className={`w-4 h-4 transition-transform duration-200 ${usefulInfoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-brand-blue)] transition-all duration-200 group-hover:w-full"></span>
                </button>
                {usefulInfoOpen && (
                  <div className="absolute top-full left-0 mt-1 pt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/case-studies"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setUsefulInfoOpen(false)}
                    >
                      {t('caseStudies')}
                    </Link>
                    <Link
                      href="/useful-column"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setUsefulInfoOpen(false)}
                    >
                      {t('usefulInformation')}
                    </Link>
                    <Link
                      href="/useful-video"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setUsefulInfoOpen(false)}
                    >
                      {t('useful-video')}
                    </Link>
                    <Link
                      href="/ai-agent"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setUsefulInfoOpen(false)}
                    >
                      {t('aiAgents')}
                    </Link>
                    <Link
                      href="/notice"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#5FA4E6]/10 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setUsefulInfoOpen(false)}
                    >
                      {t('notice')}
                    </Link>
                    
                  </div>
                )}
              </div>
            </div>
            
            {/* Language Toggle - Compact */}
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ja' : 'en')}
              className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 group"
              title={locale === 'en' ? 'Switch to Japanese' : 'Switch to English'}
            >
              <svg className="w-4 h-4 text-gray-600 group-hover:text-[#5FA4E6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-[#5FA4E6] transition-colors">
                {locale === 'en' ? 'EN' : 'JA'}
              </span>
            </button>

            <Link href="/contact" className="inline-flex items-center gap-2 px-4 md:px-5 lg:px-6 py-2 md:py-2.5 bg-[#5FA4E6] text-white rounded-full shadow-[0_4px_0_#4A8FD1] hover:bg-[#7AB5ED] hover:shadow-[0_3px_0_#4A8FD1] active:shadow-[0_1px_0_#4A8FD1] active:translate-y-[2px] transition-all duration-150 text-xs md:text-sm font-bold whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              {t('button')}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Mobile Language Toggle - Compact */}
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ja' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200"
              title={locale === 'en' ? 'Switch to Japanese' : 'Switch to English'}
            >
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">
                {locale === 'en' ? 'EN' : 'JA'}
              </span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md">
            <div className="px-4 md:px-6 py-6 md:py-8 space-y-0 max-w-2xl md:mx-auto">
              {/* 1. Company Overview */}
              <Link
                href="/company"
                className="block py-3 md:py-4 text-base md:text-lg text-gray-700 hover:text-[#5FA4E6] transition-colors font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('companyOverview')}
              </Link>

              {/* 2. AI Transformation - Dropdown */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'ai' ? null : 'ai')}
                  className="w-full flex items-center justify-between py-3 md:py-4 text-base md:text-lg text-gray-700 hover:text-[#5FA4E6] transition-colors font-medium"
                >
                  <span>{t('aiTransformation')}</span>
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${mobileDropdownOpen === 'ai' ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileDropdownOpen === 'ai' && (
                  <div className="pl-4 pb-2 space-y-2">
                    <Link
                      href="/ai-transformation"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('cosbeAiTransformation')}
                    </Link>
                    <Link
                      href="/ai-lab"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('fastAiLab')}
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. AI Partner Recruitment */}
              <Link
                href="/recruit"
                className="block py-3 md:py-4 text-base md:text-lg text-gray-700 hover:text-[#5FA4E6] transition-colors font-medium border-b border-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('aiPartnerRecruitment')}
              </Link>

              {/* 4. Useful Information - Dropdown */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'useful' ? null : 'useful')}
                  className="w-full flex items-center justify-between py-3 md:py-4 text-base md:text-lg text-gray-700 hover:text-[#5FA4E6] transition-colors font-medium"
                >
                  <span>{t('usefulInfo')}</span>
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${mobileDropdownOpen === 'useful' ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileDropdownOpen === 'useful' && (
                  <div className="pl-4 pb-2 space-y-2">
                    <Link
                      href="/case-studies"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('caseStudies')}
                    </Link>
                    <Link
                      href="/useful-column"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('usefulInformation')}
                    </Link>
                    <Link
                      href="/useful-video"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('useful-video')}
                    </Link>
                    <Link
                      href="/ai-agent"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('aiAgents')}
                    </Link>
                    <Link
                      href="/notice"
                      className="block py-2 text-sm text-gray-600 hover:text-[#5FA4E6] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('notice')}
                    </Link>
                    
                  </div>
                )}
              </div>

              <Link href="/contact" className="flex items-center justify-center gap-2 w-full mt-4 md:mt-6 px-6 py-3 md:py-3.5 bg-[#5FA4E6] text-white rounded-full shadow-[0_4px_0_#4A8FD1] hover:bg-[#7AB5ED] hover:shadow-[0_3px_0_#4A8FD1] active:shadow-[0_1px_0_#4A8FD1] active:translate-y-[2px] transition-all duration-150 text-sm md:text-base font-bold" onClick={() => setMobileMenuOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                {t('button')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


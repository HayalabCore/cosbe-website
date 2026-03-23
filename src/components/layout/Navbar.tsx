'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';
import { useState } from 'react';
import { useDropdown } from '@/hooks';

interface NavDropdownItem {
  href: string;
  labelKey: string;
}

interface NavItem {
  href?: string;
  labelKey: string;
  children?: NavDropdownItem[];
}

const navItems: NavItem[] = [
  { href: '/company', labelKey: 'companyOverview' },
  {
    labelKey: 'aiTransformation',
    children: [
      { href: '/ai-transformation', labelKey: 'cosbeAiTransformation' },
      { href: '/ai-lab', labelKey: 'fastAiLab' },
    ],
  },
  { href: '/recruit', labelKey: 'aiPartnerRecruitment' },
  {
    labelKey: 'usefulInfo',
    children: [
      { href: '/case-studies', labelKey: 'caseStudies' },
      { href: '/useful-column', labelKey: 'usefulInformation' },
      { href: '/useful-video', labelKey: 'useful-video' },
      { href: '/ai-agent', labelKey: 'aiAgents' },
      { href: '/notice', labelKey: 'notice' },
    ],
  },
];

export default function Navbar() {
  const t = useTranslations('navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(
    null
  );

  const aiTransformationDropdown = useDropdown(200);
  const usefulInfoDropdown = useDropdown(200);

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileDropdown = (key: string) => {
    setMobileDropdownOpen(mobileDropdownOpen === key ? null : key);
  };

  const dropdownMap: Record<string, typeof aiTransformationDropdown> = {
    aiTransformation: aiTransformationDropdown,
    usefulInfo: usefulInfoDropdown,
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
              {navItems.map((item) => {
                if (item.children) {
                  const dropdown = dropdownMap[item.labelKey];
                  return (
                    <div
                      key={item.labelKey}
                      className="relative"
                      onMouseEnter={dropdown.handleMouseEnter}
                      onMouseLeave={dropdown.handleMouseLeave}
                    >
                      <button className="text-textHeading hover:text-primaryColor transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap flex items-center gap-1">
                        {t(item.labelKey)}
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${dropdown.isOpen ? 'rotate-180' : ''}`}
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
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryColor transition-all duration-200 group-hover:w-full" />
                      </button>
                      {dropdown.isOpen && (
                        <div className="absolute top-full left-0 mt-1 pt-2 w-56 bg-white rounded-lg shadow-lg border border-borderPrimary py-2 z-50">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2.5 text-sm text-textSecondary hover:bg-primaryColor/10 hover:text-primaryColor transition-colors"
                              onClick={dropdown.close}
                            >
                              {t(child.labelKey)}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.labelKey}
                    href={item.href!}
                    className="text-textHeading hover:text-primaryColor transition-all duration-200 text-xs lg:text-sm font-medium relative group whitespace-nowrap"
                  >
                    {t(item.labelKey)}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primaryColor transition-all duration-200 group-hover:w-full" />
                  </Link>
                );
              })}
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ja' : 'en')}
              className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 rounded-full border border-borderPrimary bg-white hover:bg-bgSecondary shadow-sm transition-all duration-200 group"
              title={
                locale === 'en' ? 'Switch to Japanese' : 'Switch to English'
              }
            >
              <svg
                className="w-4 h-4 text-textTertiary group-hover:text-primaryColor transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span className="text-xs font-semibold text-textSecondary group-hover:text-primaryColor transition-colors">
                {locale === 'en' ? 'EN' : 'JA'}
              </span>
            </button>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 md:px-5 lg:px-6 py-2 md:py-2.5 bg-primaryColor text-white rounded-full shadow-[0_4px_0_var(--color-primaryHover)] hover:bg-primaryLight hover:shadow-[0_3px_0_var(--color-primaryHover)] active:shadow-[0_1px_0_var(--color-primaryHover)] active:translate-y-[2px] transition-all duration-150 text-xs md:text-sm font-bold whitespace-nowrap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              {t('button')}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => switchLocale(locale === 'en' ? 'ja' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-borderPrimary bg-white hover:bg-bgSecondary shadow-sm transition-all duration-200"
              title={
                locale === 'en' ? 'Switch to Japanese' : 'Switch to English'
              }
            >
              <svg
                className="w-3.5 h-3.5 text-textTertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span className="text-xs font-semibold text-textSecondary">
                {locale === 'en' ? 'EN' : 'JA'}
              </span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-textTertiary hover:bg-bgTertiary transition-colors"
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
          <div className="md:hidden border-t border-surface-tertiary bg-white/95 backdrop-blur-md">
            <div className="px-4 md:px-6 py-6 md:py-8 space-y-0 max-w-2xl md:mx-auto">
              {navItems.map((item) => {
                if (item.children) {
                  const dropdownKey =
                    item.labelKey === 'aiTransformation' ? 'ai' : 'useful';
                  return (
                    <div
                      key={item.labelKey}
                      className="border-b border-surface-tertiary"
                    >
                      <button
                        onClick={() => toggleMobileDropdown(dropdownKey)}
                        className="w-full flex items-center justify-between py-3 md:py-4 text-base md:text-lg text-textSecondary hover:text-primaryColor transition-colors font-medium"
                      >
                        <span>{t(item.labelKey)}</span>
                        <svg
                          className={`w-5 h-5 transition-transform duration-200 ${mobileDropdownOpen === dropdownKey ? 'rotate-180' : ''}`}
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
                      </button>
                      {mobileDropdownOpen === dropdownKey && (
                        <div className="pl-4 pb-2 space-y-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block py-2 text-sm text-textTertiary hover:text-primaryColor transition-colors"
                              onClick={closeMobileMenu}
                            >
                              {t(child.labelKey)}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.labelKey}
                    href={item.href!}
                    className="block py-3 md:py-4 text-base md:text-lg text-textSecondary hover:text-primaryColor transition-colors font-medium border-b border-surface-tertiary"
                    onClick={closeMobileMenu}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}

              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 w-full mt-4 md:mt-6 px-6 py-3 md:py-3.5 bg-primaryColor text-white rounded-full shadow-[0_4px_0_var(--color-primaryHover)] hover:bg-primaryLight hover:shadow-[0_3px_0_var(--color-primaryHover)] active:shadow-[0_1px_0_var(--color-primaryHover)] active:translate-y-[2px] transition-all duration-150 text-sm md:text-base font-bold"
                onClick={closeMobileMenu}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                {t('button')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

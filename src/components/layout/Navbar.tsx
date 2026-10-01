'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';
import { useState } from 'react';
import { useDropdown } from '@/hooks';
import { ChevronRight, ChevronDown, Menu, X } from 'lucide-react';

const LOCALE_LABELS: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本' },
];

function LanguageToggle({
  locale,
  onSwitch,
  compact = false,
}: {
  locale: string;
  onSwitch: (locale: Locale) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-full border border-borderPrimary bg-white p-0.5 font-semibold ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      role="group"
      aria-label="Language"
    >
      {LOCALE_LABELS.map(({ code, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => !active && onSwitch(code)}
            aria-pressed={active}
            className={`rounded-full transition-colors ${
              compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
            } ${
              active
                ? 'bg-primaryColor text-white'
                : 'cursor-pointer text-textTertiary hover:text-primaryColor'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface NavDropdownItem {
  href: string;
  labelKey: string;
}

interface NavItem {
  href?: string;
  labelKey: string;
  dropdownKey?: string;
  children?: NavDropdownItem[];
}

const navItems: NavItem[] = [
  {
    labelKey: 'nav.aiTransformation',
    dropdownKey: 'aiTransformation',
    children: [
      { href: '/about-ait', labelKey: 'nav.aboutAit' },
      { href: '/ai-transformation', labelKey: 'nav.cosbeAit' },
      { href: '/ai-lab', labelKey: 'nav.fastAiLab' },
    ],
  },
  { href: '/case-studies', labelKey: 'nav.caseStudies' },
  {
    labelKey: 'nav.resources',
    dropdownKey: 'resources',
    children: [
      { href: '/useful-column', labelKey: 'nav.articles' },
      { href: '/useful-video', labelKey: 'nav.videos' },
      { href: '/ai-agent', labelKey: 'nav.aiAgents' },
      { href: '/notice', labelKey: 'nav.news' },
    ],
  },
  { href: '/company', labelKey: 'nav.company' },
  { href: '/partners', labelKey: 'nav.partners' },
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
  const resourcesDropdown = useDropdown(200);

  const dropdownMap: Record<string, ReturnType<typeof useDropdown>> = {
    aiTransformation: aiTransformationDropdown,
    resources: resourcesDropdown,
  };

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const toggleMobileDropdown = (key: string) => {
    setMobileDropdownOpen(mobileDropdownOpen === key ? null : key);
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.15)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-18 lg:h-20">
          {/* Logo */}
          <Link href="/" className="z-50 flex items-center">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={120}
              height={40}
              className="h-7 w-auto md:h-7.5 lg:h-8"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            <div className="flex items-center gap-5 lg:gap-8">
              {navItems.map((item) => {
                if (item.children && item.dropdownKey) {
                  const dropdown = dropdownMap[item.dropdownKey];
                  return (
                    <div
                      key={item.labelKey}
                      className="relative"
                      onMouseEnter={dropdown.handleMouseEnter}
                      onMouseLeave={dropdown.handleMouseLeave}
                    >
                      <button className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-[#263238] transition-colors hover:text-primaryColor lg:text-base">
                        {t(item.labelKey)}
                        <ChevronDown
                          className={`size-4 transition-transform duration-200 ${
                            dropdown.isOpen ? 'rotate-180' : ''
                          }`}
                          strokeWidth={2}
                        />
                      </button>
                      {dropdown.isOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
                          <div className="w-max min-w-[160px] overflow-hidden rounded-[10px] bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="block whitespace-nowrap px-5 py-3.5 text-left text-base font-medium text-[#263238] transition-colors hover:bg-[#e6f2fd] hover:text-primaryColor"
                                onClick={dropdown.close}
                              >
                                {t(child.labelKey)}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.labelKey}
                    href={item.href!}
                    className="whitespace-nowrap text-sm font-medium text-[#263238] transition-colors hover:text-primaryColor lg:text-base"
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>

            {/* Language Toggle */}
            <LanguageToggle locale={locale} onSwitch={switchLocale} />

            {/* Consult button */}
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primaryColor px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primaryHover lg:text-base"
            >
              {t('nav.contactUs')}
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle locale={locale} onSwitch={switchLocale} compact />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-textTertiary transition-colors hover:bg-bgTertiary"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-borderPrimary bg-white md:hidden">
            <div className="max-w-2xl space-y-0 px-4 py-6 md:mx-auto md:px-6 md:py-8">
              {navItems.map((item) => {
                if (item.children && item.dropdownKey) {
                  const key = item.dropdownKey;
                  return (
                    <div
                      key={item.labelKey}
                      className="border-b border-borderPrimary"
                    >
                      <button
                        onClick={() => toggleMobileDropdown(key)}
                        className="flex w-full items-center justify-between py-3 text-base font-medium text-textSecondary transition-colors hover:text-primaryColor md:py-4 md:text-lg"
                      >
                        <span>{t(item.labelKey)}</span>
                        <ChevronDown
                          className={`size-5 transition-transform duration-200 ${
                            mobileDropdownOpen === key ? 'rotate-180' : ''
                          }`}
                          strokeWidth={2}
                        />
                      </button>
                      {mobileDropdownOpen === key && (
                        <div className="space-y-2 pb-2 pl-4">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block py-2 text-sm text-textTertiary transition-colors hover:text-primaryColor"
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
                    className="block border-b border-borderPrimary py-3 text-base font-medium text-textSecondary transition-colors hover:text-primaryColor md:py-4 md:text-lg"
                    onClick={closeMobileMenu}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}

              <Link
                href="/contact"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primaryColor px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primaryHover md:mt-6 md:py-3.5 md:text-base"
                onClick={closeMobileMenu}
              >
                {t('nav.contactUs')}
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

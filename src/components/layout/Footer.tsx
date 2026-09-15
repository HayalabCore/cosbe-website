import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import CookieSettingsButton from './CookieSettingsButton';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-bgFooter text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-12 sm:px-10 lg:px-[60px]">
        {/* Top: company info + link columns */}
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Company info */}
          <div>
            <p className="text-2xl font-medium">{t('companyName')}</p>
            <p className="mt-2 max-w-[448px] text-sm font-medium">
              {t('address')}
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:gap-24">
            <ul className="space-y-2 text-sm">
              <li className="font-medium">{t('aiTransformation')}</li>
              <li>
                <FooterLink href="/case-studies">{t('caseStudies')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/#partners">{t('partners')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/company">{t('company')}</FooterLink>
              </li>
              <li>
                <FooterLink href="/recruit" muted>
                  {t('careers')}
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">{t('contact')}</FooterLink>
              </li>
            </ul>

            <ul className="space-y-2 text-sm">
              <li className="font-medium">{t('resources')}</li>
              <li>
                <FooterLink href="/useful-video" muted>
                  {t('videos')}
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/useful-column" muted>
                  {t('articles')}
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/download" muted>
                  {t('materials')}
                </FooterLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-16 text-3xl font-medium sm:text-[40px]">
          <span>The </span>
          <span className="text-primaryColor">Cos</span>
          <span>mopolitan </span>
          <span className="text-primaryColor">B</span>
          <span>usiness </span>
          <span className="text-primaryColor">E</span>
          <span>ngine</span>
        </p>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-2 border-t border-white/20 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <FooterLink href="/privacy-policy" muted>
              {t('privacyPolicy')}
            </FooterLink>
            <CookieSettingsButton label={t('cookieSettings')} />
          </div>
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  muted = false,
  children,
}: {
  href: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`transition-colors hover:text-primaryColor ${
        muted ? 'font-normal' : 'font-medium'
      }`}
    >
      {children}
    </Link>
  );
}

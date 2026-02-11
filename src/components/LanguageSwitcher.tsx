'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => switchLocale('en')}
        className={`px-3 py-1 rounded ${
          locale === 'en'
            ? 'bg-primaryColor text-white'
            : 'bg-borderPrimary text-textSecondary hover:bg-borderPrimaryPrimary-secondary'
        }`}
      >
        English
      </button>
      <button
        onClick={() => switchLocale('ja')}
        className={`px-3 py-1 rounded ${
          locale === 'ja'
            ? 'bg-primaryColor text-white'
            : 'bg-borderPrimary text-textSecondary hover:bg-borderPrimaryPrimary-secondary'
        }`}
      >
        日本語
      </button>
    </div>
  );
}


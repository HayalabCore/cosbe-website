'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  GA_MEASUREMENT_ID,
  OPT_IN_REGIONS,
  type ConsentChoice,
} from '@/lib/analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readChoice(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

const denied = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

// Consent Mode v2: regional defaults first, then the stored choice (if any).
const initScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', ${JSON.stringify({
  ...denied,
  analytics_storage: 'denied',
  region: OPT_IN_REGIONS,
  wait_for_update: 500,
})});
gtag('consent', 'default', ${JSON.stringify({
  ...denied,
  analytics_storage: 'granted',
})});
try {
  var c = localStorage.getItem('${CONSENT_STORAGE_KEY}');
  if (c === 'granted' || c === 'denied') {
    gtag('consent', 'update', { analytics_storage: c });
  }
} catch (e) {}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`;

export default function Analytics() {
  const t = useTranslations('cookieConsent');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (readChoice() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

  const choose = (choice: ConsentChoice) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      // Storage unavailable: the choice applies to this page view only.
    }
    window.gtag?.('consent', 'update', { analytics_storage: choice });
    setOpen(false);
  };

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {initScript}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      {open && (
        <div
          role="dialog"
          aria-label={t('title')}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-borderPrimary bg-white p-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-textSecondary">
              {t('message')}{' '}
              <Link
                href="/privacy-policy"
                className="text-primaryColor underline"
              >
                {t('learnMore')}
              </Link>
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => choose('denied')}
                className="rounded border border-borderPrimary px-4 py-2 text-sm text-textSecondary hover:bg-bgSecondary"
              >
                {t('decline')}
              </button>
              <button
                type="button"
                onClick={() => choose('granted')}
                className="rounded bg-primaryColor px-4 py-2 text-sm text-white hover:bg-primaryHover"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

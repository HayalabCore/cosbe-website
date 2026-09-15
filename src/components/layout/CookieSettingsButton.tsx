'use client';

import { CONSENT_OPEN_EVENT, GA_MEASUREMENT_ID } from '@/lib/analytics';

export default function CookieSettingsButton({ label }: { label: string }) {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className="font-normal transition-colors hover:text-primaryColor"
    >
      {label}
    </button>
  );
}

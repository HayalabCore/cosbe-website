'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';

const HUBSPOT_PORTAL_ID =
  process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || '242892919';
const HUBSPOT_FORM_ID_EN =
  process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID_EN ||
  '0d5cad56-b943-4915-a0dd-9962f172d287';
const HUBSPOT_FORM_ID_JA =
  process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID_JA ||
  'e12c67ce-3c60-46b3-a798-c0856d8a8edf';

export default function HubSpotForm() {
  const locale = useLocale();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const formId = locale === 'ja' ? HUBSPOT_FORM_ID_JA : HUBSPOT_FORM_ID_EN;

    const createForm = () => {
      if (window.hbspt && formContainerRef.current && !isLoadedRef.current) {
        window.hbspt.forms.create({
          portalId: HUBSPOT_PORTAL_ID,
          formId: formId,
          region: 'na2',
          target: `#hubspot-form-${locale}`,
        });
        isLoadedRef.current = true;
      }
    };

    if (window.hbspt) {
      createForm();
      return;
    }

    const script = document.createElement('script');
    script.src = '//js-na2.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = createForm;
    script.onerror = () => {
      console.error('Failed to load HubSpot form script');
    };

    document.body.appendChild(script);

    return () => {
      isLoadedRef.current = false;
    };
  }, [locale]);

  return (
    <div
      id={`hubspot-form-${locale}`}
      ref={formContainerRef}
      className="hubspot-form-container"
    />
  );
}

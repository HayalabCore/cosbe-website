'use client';

import { useEffect, useId, useRef } from 'react';
import { useLocale } from 'next-intl';

const HUBSPOT_PORTAL_ID =
  process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID || '242892919';
const HUBSPOT_FORM_ID_EN =
  process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID_EN ||
  '1fcab1a2-255d-48cd-9153-967053a636cb';
const HUBSPOT_FORM_ID_JA =
  process.env.NEXT_PUBLIC_HUBSPOT_FORM_ID_JA ||
  '8c1f461a-fa65-4aae-ad12-bd5950ae9024';

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: {
          portalId: string;
          formId: string;
          region: string;
          target: string;
        }) => void;
      };
    };
  }
}

export default function HubSpotForm() {
  const locale = useLocale();
  const instanceId = useId().replace(/:/g, '');
  const targetId = `hubspot-form-${locale}-${instanceId}`;
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = formContainerRef.current;
    if (!container) return;

    const formId = locale === 'ja' ? HUBSPOT_FORM_ID_JA : HUBSPOT_FORM_ID_EN;
    container.innerHTML = '';

    const createForm = () => {
      if (!window.hbspt || !formContainerRef.current) return;

      window.hbspt.forms.create({
        portalId: HUBSPOT_PORTAL_ID,
        formId,
        region: 'na2',
        target: `#${targetId}`,
      });
    };

    if (window.hbspt) {
      createForm();
      return;
    }

    const existing = document.querySelector(
      'script[data-hubspot-forms-v2="true"]'
    );

    if (existing) {
      existing.addEventListener('load', createForm);
      if (window.hbspt) createForm();
      return () => existing.removeEventListener('load', createForm);
    }

    const script = document.createElement('script');
    script.src = 'https://js-na2.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    script.async = true;
    script.dataset.hubspotFormsV2 = 'true';
    script.onload = createForm;
    script.onerror = () => {
      console.error('Failed to load HubSpot form script');
    };

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', createForm);
    };
  }, [locale, targetId]);

  return (
    <div
      id={targetId}
      ref={formContainerRef}
      className="hubspot-form-container"
    />
  );
}

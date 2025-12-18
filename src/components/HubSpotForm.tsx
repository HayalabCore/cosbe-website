'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';

export default function HubSpotForm() {
  const locale = useLocale();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    // Form IDs based on locale
    const formId = locale === 'ja' 
      ? 'e12c67ce-3c60-46b3-a798-c0856d8a8edf' // Japanese form
      : '0d5cad56-b943-4915-a0dd-9962f172d287'; // English form

    // Check if script is already loaded
    if (window.hbspt) {
      if (!isLoadedRef.current && formContainerRef.current) {
        window.hbspt.forms.create({
          portalId: '242892919',
          formId: formId,
          region: 'na2',
          target: `#hubspot-form-${locale}`,
        });
        isLoadedRef.current = true;
      }
      return;
    }

    // Load HubSpot script
    const script = document.createElement('script');
    script.src = '//js-na2.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      if (window.hbspt && formContainerRef.current && !isLoadedRef.current) {
        window.hbspt.forms.create({
          portalId: '242892919',
          formId: formId,
          region: 'na2',
          target: `#hubspot-form-${locale}`,
        });
        isLoadedRef.current = true;
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
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

// TypeScript declaration for HubSpot
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


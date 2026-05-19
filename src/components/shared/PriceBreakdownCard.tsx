'use client';

import { useTranslations } from 'next-intl';

/** Monthly fee + maintenance card — shared copy from `aiLabPage.priceBreakdown` */
export default function PriceBreakdownCard() {
  const t = useTranslations('aiLabPage');

  return (
    <div className="rounded-2xl border-2 border-borderPrimary bg-white p-6 md:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-base font-bold text-textPrimary md:text-lg">
            <span>{t('priceBreakdown.primaryLabel')}：</span>
            <span className="text-primaryColor">
              {t('priceBreakdown.primaryPrice')}
            </span>
          </p>
          <p className="ml-1 mt-1.5 text-xs text-textSecondary md:text-sm">
            {t('priceBreakdown.primaryNote')}
          </p>
        </div>
        <hr className="border-borderSecondary" />
        <div>
          <p className="text-base font-bold text-textPrimary md:text-lg">
            <span>{t('priceBreakdown.maintenanceLabel')}：</span>
            <span className="text-primaryColor">
              {t('priceBreakdown.maintenancePrice')}
            </span>
          </p>
          <p className="ml-1 mt-1.5 text-xs text-textSecondary md:text-sm">
            {t('priceBreakdown.maintenanceNote')}
          </p>
        </div>
      </div>
    </div>
  );
}

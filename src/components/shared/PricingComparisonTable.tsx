'use client';

import { useTranslations } from 'next-intl';

type PricingComparisonTableProps = {
  /** Show title + subtitle paragraphs above the table (ai-lab style) */
  showIntro?: boolean;
};

const FEATURE_ROWS = ['rowAgile', 'rowConsulting', 'rowTools'] as const;

/** CosBE vs competitors table — shared copy from `aiLabPage.comparison` */
export default function PricingComparisonTable({
  showIntro = true,
}: PricingComparisonTableProps) {
  const t = useTranslations('aiLabPage');

  return (
    <div>
      {showIntro ? (
        <>
          <h2 className="mb-4 text-2xl font-bold text-primaryColor md:text-3xl">
            {t('comparison.title')}
          </h2>
          <p className="mb-2 text-base text-textPrimary md:text-lg">
            <span>{t('comparison.subtitleLight')}</span>
            <span className="font-bold">{t('comparison.subtitleBold')}</span>
          </p>
          <div className="mb-8 space-y-2 text-sm text-textSecondary md:text-base">
            <p>{t('comparison.p1')}</p>
            <p>{t('comparison.p2')}</p>
            <p>{t('comparison.p3')}</p>
          </div>
        </>
      ) : null}

      <p className="mb-2 text-xs text-textTertiary md:hidden">
        {t('comparison.scrollHint')}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-borderPrimary shadow-sm">
        <table className="w-full min-w-[640px] bg-white text-center text-sm md:text-base">
          <thead>
            <tr className="bg-bgAccent">
              <th className="px-4 py-4 text-left font-semibold text-textSecondary">
                &nbsp;
              </th>
              <th className="border-l-2 border-primaryColor bg-primaryColor/5 px-4 py-4 font-bold text-primaryColor">
                {t('comparison.us')}
              </th>
              <th className="px-4 py-4 font-semibold text-textPrimary">
                {t('comparison.competitorA')}
              </th>
              <th className="px-4 py-4 font-semibold text-textPrimary">
                {t('comparison.competitorB')}
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((row) => (
              <tr key={row} className="border-t border-borderSecondary">
                <th className="px-4 py-4 text-left font-semibold text-textPrimary">
                  {t(`comparison.${row}`)}
                </th>
                <td className="border-l-2 border-primaryColor bg-primaryColor/5 px-4 py-4">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primaryColor font-bold text-white">
                    ✓
                  </span>
                </td>
                <td className="px-4 py-4 text-textTertiary">—</td>
                <td className="px-4 py-4 text-textTertiary">—</td>
              </tr>
            ))}
            <tr className="border-t border-borderSecondary">
              <th className="px-4 py-4 text-left font-semibold text-textPrimary">
                {t('comparison.rowPrice')}
              </th>
              <td className="whitespace-pre-line border-l-2 border-primaryColor bg-primaryColor/5 px-4 py-4 font-bold text-primaryColor">
                {t('comparison.priceUs')}
              </td>
              <td className="whitespace-pre-line px-4 py-4 text-textPrimary">
                {t('comparison.priceA')}
              </td>
              <td className="whitespace-pre-line px-4 py-4 text-textPrimary">
                {t('comparison.priceB')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

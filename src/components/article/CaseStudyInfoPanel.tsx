import { getTranslations } from 'next-intl/server';
import type { CaseStudyMeta } from '@/types';
import { hasCaseStudyMeta } from '@/types';

type Props = {
  meta: CaseStudyMeta | undefined;
  locale: string;
};

export default async function CaseStudyInfoPanel({ meta, locale }: Props) {
  if (!hasCaseStudyMeta(meta)) return null;

  const t = await getTranslations({ locale, namespace: 'caseStudyPanel' });
  const m = meta!;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-textPrimary">{t('title')}</h2>
      </div>
      <dl className="p-4 space-y-3 text-sm">
        {m.clientName ? (
          <div className="flex flex-col">
            <dt className="text-xs text-slate-500">{t('clientName')}</dt>
            <dd className="text-slate-900 font-medium">{m.clientName}</dd>
          </div>
        ) : null}
        {m.clientLocation ? (
          <div className="flex flex-col">
            <dt className="text-xs text-slate-500">{t('clientLocation')}</dt>
            <dd className="text-slate-700">{m.clientLocation}</dd>
          </div>
        ) : null}
        {m.clientUrl ? (
          <div className="flex flex-col">
            <dt className="text-xs text-slate-500">{t('clientUrl')}</dt>
            <dd>
              <a
                href={m.clientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primaryColor hover:underline break-all"
              >
                {m.clientUrl}
              </a>
            </dd>
          </div>
        ) : null}
        {m.aiModels.length ? (
          <div className="flex flex-col">
            <dt className="text-xs text-slate-500">{t('aiModels')}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {m.aiModels.map((model) => (
                <span
                  key={model}
                  className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700"
                >
                  {model}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {m.mainChallenges ? (
          <div className="flex flex-col">
            <dt className="text-xs text-slate-500">{t('mainChallenges')}</dt>
            <dd className="text-slate-700 whitespace-pre-line">
              {m.mainChallenges}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

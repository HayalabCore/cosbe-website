'use client';

import { useTranslations } from 'next-intl';
import type { CaseStudyMeta } from '@/types';

type Props = {
  value: CaseStudyMeta;
  onChange: (patch: Partial<CaseStudyMeta>) => void;
};

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';
const LABEL_CLS =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5';

export default function CaseStudyMetaFields({ value, onChange }: Props) {
  const t = useTranslations('admin.caseStudyMeta');

  const aiModelsStr = value.aiModels.join(', ');

  return (
    <div className="space-y-3">
      <div>
        <label className={LABEL_CLS}>{t('clientName')}</label>
        <input
          className={INPUT_CLS}
          placeholder={t('clientNamePlaceholder')}
          value={value.clientName ?? ''}
          onChange={(e) => onChange({ clientName: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>{t('clientLocation')}</label>
        <input
          className={INPUT_CLS}
          placeholder={t('clientLocationPlaceholder')}
          value={value.clientLocation ?? ''}
          onChange={(e) => onChange({ clientLocation: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>{t('clientUrl')}</label>
        <input
          type="url"
          className={INPUT_CLS}
          placeholder="https://example.com"
          value={value.clientUrl ?? ''}
          onChange={(e) => onChange({ clientUrl: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>{t('aiModels')}</label>
        <input
          className={INPUT_CLS}
          placeholder={t('aiModelsPlaceholder')}
          value={aiModelsStr}
          onChange={(e) =>
            onChange({
              aiModels: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <p className="mt-1 text-[10px] text-slate-400">{t('aiModelsHint')}</p>
      </div>

      <div>
        <label className={LABEL_CLS}>{t('mainChallenges')}</label>
        <textarea
          className={`${INPUT_CLS} min-h-[80px] resize-y`}
          placeholder={t('mainChallengesPlaceholder')}
          value={value.mainChallenges ?? ''}
          onChange={(e) => onChange({ mainChallenges: e.target.value })}
        />
      </div>
    </div>
  );
}

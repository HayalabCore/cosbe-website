'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import BlockLocaleTabs, { type LocaleEditTab } from './BlockLocaleTabs';
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

      <CaseStudyCardFields value={value} onChange={onChange} />
    </div>
  );
}

/** Japanese source fields of the summary card; each has an `*En` twin. */
const CARD_FIELDS = [
  'industry',
  'uniqueValue',
  'mainChallenges',
  'solution',
  'result',
] as const;

type CardField = (typeof CARD_FIELDS)[number];

function CaseStudyCardFields({ value, onChange }: Props) {
  const t = useTranslations('admin.caseStudyMeta');
  const [tab, setTab] = useState<LocaleEditTab>('original');
  const [generating, setGenerating] = useState(false);

  const isOriginal = tab === 'original';
  const keyFor = (field: CardField) =>
    isOriginal ? field : (`${field}En` as const);
  const hasSource = CARD_FIELDS.some((f) => value[f]?.trim());

  async function handleGenerate() {
    const fields = CARD_FIELDS.filter((f) => value[f]?.trim());
    if (!fields.length || generating) return;
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'list',
        items: fields.map((f) => value[f]!.trim()),
      });
      if (result.type !== 'list') return;
      onChange(
        Object.fromEntries(
          fields.map((f, i) => [`${f}En`, result.itemsEn[i] ?? ''])
        )
      );
      setTab('english');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <p className={LABEL_CLS}>{t('cardSection')}</p>
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        generateDisabled={!hasSource}
      />
      {CARD_FIELDS.map((field) => {
        const key = keyFor(field);
        return (
          <div key={field}>
            <label className={LABEL_CLS}>{t(field)}</label>
            {field === 'industry' ? (
              <input
                className={INPUT_CLS}
                placeholder={t('industryPlaceholder')}
                value={value[key] ?? ''}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            ) : (
              <textarea
                className={`${INPUT_CLS} min-h-[64px] resize-y`}
                value={value[key] ?? ''}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

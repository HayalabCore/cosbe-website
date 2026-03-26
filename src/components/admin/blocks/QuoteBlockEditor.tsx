'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { QuoteBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

const QUOTE_ICON_SVG = (
  <svg
    className="absolute left-3 top-3 w-4 h-4 text-slate-300 pointer-events-none"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

const QUOTE_BODY_TEXTAREA_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 min-h-[80px] resize-y transition-all italic';

export default function QuoteBlockEditor({
  block,
  onChange,
}: {
  block: QuoteBlock;
  onChange: (b: QuoteBlock) => void;
}) {
  const t = useTranslations('admin.quote');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useState<'original' | 'english'>('original');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'quote',
        content: block.content,
        citation: block.citation,
      });
      if (result.type === 'quote') {
        onChange({
          ...block,
          contentEn: result.contentEn,
          citationEn: result.citationEn,
        });
        setTab('english');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        generateDisabled={!block.content.trim()}
      />
      <div className="space-y-2.5">
        <div className="relative">
          {QUOTE_ICON_SVG}
          <textarea
            className={QUOTE_BODY_TEXTAREA_CLS}
            placeholder={
              tab === 'original' ? t('placeholder') : te('englishPlaceholder')
            }
            value={tab === 'original' ? block.content : (block.contentEn ?? '')}
            onChange={(e) =>
              tab === 'original'
                ? onChange({ ...block, content: e.target.value })
                : onChange({ ...block, contentEn: e.target.value })
            }
          />
        </div>
        <input
          className={INPUT_CLS}
          placeholder={t('citationPlaceholder')}
          value={
            tab === 'original'
              ? (block.citation ?? '')
              : (block.citationEn ?? '')
          }
          onChange={(e) =>
            tab === 'original'
              ? onChange({ ...block, citation: e.target.value })
              : onChange({ ...block, citationEn: e.target.value })
          }
        />
      </div>
    </div>
  );
}

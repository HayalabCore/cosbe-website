'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { QuoteBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';
import { useLocaleEditTab } from '@/hooks';

const QUOTE_CLS =
  'w-full resize-none border-0 bg-transparent p-0 text-lg italic leading-8 text-slate-700 placeholder:text-slate-300 focus:outline-none [field-sizing:content] min-h-8';
const CITATION_CLS =
  'w-full border-0 bg-transparent p-0 text-sm text-slate-500 placeholder:text-slate-300 focus:outline-none';

export default function QuoteBlockEditor({
  block,
  onChange,
  localeViewKey,
  localeViewTab = 'original',
  bulkTranslating = false,
}: {
  block: QuoteBlock;
  onChange: (b: QuoteBlock) => void;
  localeViewKey?: number;
  localeViewTab?: 'original' | 'english';
  bulkTranslating?: boolean;
}) {
  const t = useTranslations('admin.quote');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useLocaleEditTab(localeViewKey, localeViewTab);
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
        bulkTranslating={bulkTranslating}
        generateDisabled={!block.content.trim()}
      />
      <div className="space-y-1.5 border-l-[3px] border-primaryColor/60 py-1 pl-4">
        <div>
          <textarea
            rows={1}
            className={QUOTE_CLS}
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
          className={CITATION_CLS}
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

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { HeadingBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';
import { useLocaleEditTab } from '@/hooks';

/** Typed at the size it is published in, so the outline reads at a glance. */
const LEVEL_TEXT: Record<HeadingBlock['level'], string> = {
  1: 'text-3xl font-bold leading-snug',
  2: 'text-2xl font-bold leading-snug',
  3: 'text-xl font-bold leading-snug',
  4: 'text-lg font-semibold leading-snug',
};
const SELECT_CLS =
  'shrink-0 cursor-pointer appearance-none rounded-md bg-slate-100 px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40';

export default function HeadingBlockEditor({
  block,
  onChange,
  localeViewKey,
  localeViewTab = 'original',
  bulkTranslating = false,
}: {
  block: HeadingBlock;
  onChange: (b: HeadingBlock) => void;
  localeViewKey?: number;
  localeViewTab?: 'original' | 'english';
  bulkTranslating?: boolean;
}) {
  const t = useTranslations('admin.heading');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useLocaleEditTab(localeViewKey, localeViewTab);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'heading',
        content: block.content,
      });
      if (result.type === 'heading') {
        onChange({ ...block, contentEn: result.contentEn });
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
      <div className="flex items-center gap-2.5">
        <select
          aria-label={t('level')}
          title={t('level')}
          className={SELECT_CLS}
          value={block.level}
          onChange={(e) =>
            onChange({
              ...block,
              level: Number(e.target.value) as HeadingBlock['level'],
            })
          }
        >
          <option value={2}>H2</option>
          <option value={3}>H3</option>
          <option value={4}>H4</option>
        </select>
        <input
          className={`w-full min-w-0 border-0 bg-transparent py-0.5 text-slate-900 placeholder:text-slate-300 focus:outline-none ${LEVEL_TEXT[block.level]}`}
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { HeadingBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';
const SELECT_CLS =
  'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: HeadingBlock;
  onChange: (b: HeadingBlock) => void;
}) {
  const t = useTranslations('admin.heading');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useState<'original' | 'english'>('original');
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
        generateDisabled={!block.content.trim()}
      />
      <div className="flex gap-2">
        <select
          className={`${SELECT_CLS} w-20 flex-shrink-0`}
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
          className={INPUT_CLS}
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

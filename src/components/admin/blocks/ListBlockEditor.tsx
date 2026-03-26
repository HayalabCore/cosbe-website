'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { ListBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';

const INPUT_CLS =
  'flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

function resizeItemsEn(items: string[], prev?: string[]): string[] {
  return items.map((_, i) => prev?.[i] ?? '');
}

export default function ListBlockEditor({
  block,
  onChange,
}: {
  block: ListBlock;
  onChange: (b: ListBlock) => void;
}) {
  const t = useTranslations('admin.list');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useState<'original' | 'english'>('original');
  const [generating, setGenerating] = useState(false);

  const itemsEn = resizeItemsEn(block.items, block.itemsEn);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'list',
        items: block.items,
      });
      if (result.type === 'list') {
        onChange({ ...block, itemsEn: result.itemsEn });
        setTab('english');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  const hasPrimary = block.items.some((s) => s.trim().length > 0);

  return (
    <div className="space-y-2.5">
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        generateDisabled={!hasPrimary}
      />

      <div className="flex gap-1.5">
        {(['bullet', 'numbered'] as const).map((lt) => (
          <button
            key={lt}
            type="button"
            onClick={() => onChange({ ...block, listType: lt })}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
              block.listType === lt
                ? 'border-primaryColor bg-primaryColor/8 text-primaryColor'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {lt === 'bullet' ? t('bullet') : t('numbered')}
          </button>
        ))}
      </div>

      {tab === 'original'
        ? block.items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0 select-none">
                {block.listType === 'bullet' ? '•' : `${idx + 1}.`}
              </span>
              <input
                className={INPUT_CLS}
                placeholder={t('itemPlaceholder', { n: idx + 1 })}
                value={item}
                onChange={(e) => {
                  const items = [...block.items];
                  items[idx] = e.target.value;
                  onChange({
                    ...block,
                    items,
                    itemsEn: resizeItemsEn(items, block.itemsEn),
                  });
                }}
              />
              <button
                type="button"
                title={t('removeItem')}
                onClick={() => {
                  const items = block.items.filter((_, j) => j !== idx);
                  onChange({
                    ...block,
                    items,
                    itemsEn: resizeItemsEn(items, block.itemsEn),
                  });
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        : block.items.map((_, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0 select-none">
                {block.listType === 'bullet' ? '•' : `${idx + 1}.`}
              </span>
              <input
                className={INPUT_CLS}
                placeholder={te('englishPlaceholder')}
                value={itemsEn[idx] ?? ''}
                onChange={(e) => {
                  const next = [...itemsEn];
                  next[idx] = e.target.value;
                  onChange({ ...block, itemsEn: next });
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                className="p-1.5 rounded-lg flex-shrink-0 invisible pointer-events-none"
                aria-hidden
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}

      {tab === 'original' && (
        <button
          type="button"
          onClick={() => {
            const items = [...block.items, ''];
            onChange({
              ...block,
              items,
              itemsEn: resizeItemsEn(items, block.itemsEn),
            });
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primaryColor hover:text-primaryHover transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('addItem')}
        </button>
      )}
    </div>
  );
}

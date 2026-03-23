'use client';

import { useTranslations } from 'next-intl';
import type { EmbedBlock } from '@/types';

const EMBED_TYPES: { value: EmbedBlock['embedType']; labelKey: 'youtube' | 'twitter' | 'link'; icon: string }[] = [
  { value: 'youtube', labelKey: 'youtube', icon: '▶' },
  { value: 'twitter', labelKey: 'twitter', icon: '✗' },
  { value: 'link', labelKey: 'link', icon: '🔗' },
];

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function EmbedBlockEditor({
  block,
  onChange,
}: {
  block: EmbedBlock;
  onChange: (b: EmbedBlock) => void;
}) {
  const t = useTranslations('admin.embed');
  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {EMBED_TYPES.map((et) => (
          <button
            key={et.value}
            type="button"
            onClick={() => onChange({ ...block, embedType: et.value })}
            className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
              block.embedType === et.value
                ? 'border-primaryColor bg-primaryColor/8 text-primaryColor'
                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span className="mr-1">{et.icon}</span>
            {t(et.labelKey)}
          </button>
        ))}
      </div>
      <input
        className={INPUT_CLS}
        placeholder={t('urlPlaceholder')}
        value={block.url}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
      />
      <input
        className={INPUT_CLS}
        placeholder={t('titlePlaceholder')}
        value={block.title ?? ''}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
    </div>
  );
}

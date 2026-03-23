'use client';

import { useTranslations } from 'next-intl';
import type { CalloutBlock } from '@/types';

const VARIANTS: { value: CalloutBlock['variant']; labelKey: 'info' | 'warning' | 'tip' | 'related'; cls: string }[] = [
  { value: 'info', labelKey: 'info', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'warning', labelKey: 'warning', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'tip', labelKey: 'tip', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'related', labelKey: 'related', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function CalloutBlockEditor({
  block,
  onChange,
}: {
  block: CalloutBlock;
  onChange: (b: CalloutBlock) => void;
}) {
  const t = useTranslations('admin.callout.variants');
  const tc = useTranslations('admin.callout');
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {VARIANTS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => onChange({ ...block, variant: v.value })}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              block.variant === v.value
                ? `${v.cls} ring-2 ring-offset-1 ring-current/40`
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {t(v.labelKey)}
          </button>
        ))}
      </div>
      <input
        className={INPUT_CLS}
        placeholder={tc('titlePlaceholder')}
        value={block.title ?? ''}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      <textarea
        className={`${INPUT_CLS} min-h-[80px] resize-y`}
        placeholder={tc('contentPlaceholder')}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
      />
    </div>
  );
}

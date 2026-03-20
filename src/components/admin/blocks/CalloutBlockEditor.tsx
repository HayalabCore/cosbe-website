'use client';

import type { CalloutBlock } from '@/types';

const VARIANTS: { value: CalloutBlock['variant']; label: string; cls: string }[] = [
  { value: 'info', label: 'ℹ Info', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'warning', label: '⚠ Warning', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'tip', label: '💡 Tip', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'related', label: '🔗 Related', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function CalloutBlockEditor({
  block,
  onChange,
}: {
  block: CalloutBlock;
  onChange: (b: CalloutBlock) => void;
}) {
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
            {v.label}
          </button>
        ))}
      </div>
      <input
        className={INPUT_CLS}
        placeholder="Title (optional)"
        value={block.title ?? ''}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      <textarea
        className={`${INPUT_CLS} min-h-[80px] resize-y`}
        placeholder="Callout content…"
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
      />
    </div>
  );
}

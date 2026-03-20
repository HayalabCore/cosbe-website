'use client';

import type { QuoteBlock } from '@/types';

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function QuoteBlockEditor({
  block,
  onChange,
}: {
  block: QuoteBlock;
  onChange: (b: QuoteBlock) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <svg className="absolute left-3 top-3 w-4 h-4 text-slate-300 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <textarea
          className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 min-h-[80px] resize-y transition-all italic"
          placeholder="Quote text…"
          value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
      </div>
      <input
        className={INPUT_CLS}
        placeholder="— Citation (optional)"
        value={block.citation ?? ''}
        onChange={(e) => onChange({ ...block, citation: e.target.value })}
      />
    </div>
  );
}

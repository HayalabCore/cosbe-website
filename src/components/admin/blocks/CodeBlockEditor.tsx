'use client';

import { useTranslations } from 'next-intl';
import type { CodeBlock } from '@/types';

const LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'bash', 'sql', 'json', 'yaml', 'markdown', 'other'];

export default function CodeBlockEditor({
  block,
  onChange,
}: {
  block: CodeBlock;
  onChange: (b: CodeBlock) => void;
}) {
  const t = useTranslations('admin.code');
  return (
    <div className="space-y-2.5">
      <select
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all"
        value={block.language}
        onChange={(e) => onChange({ ...block, language: e.target.value })}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <textarea
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:border-primaryColor/50 focus:outline-none focus:ring-2 focus:ring-primaryColor/20 min-h-[160px] resize-y transition-all leading-relaxed"
        placeholder={t('placeholder')}
        value={block.code}
        onChange={(e) => onChange({ ...block, code: e.target.value })}
        spellCheck={false}
      />
    </div>
  );
}

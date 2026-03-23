'use client';

import { useTranslations } from 'next-intl';
import type { HeadingBlock } from '@/types';

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
  return (
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
        placeholder={t('placeholder')}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
      />
    </div>
  );
}

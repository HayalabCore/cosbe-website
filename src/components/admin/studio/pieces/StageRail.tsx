'use client';

import { useTranslations } from 'next-intl';
import { STAGE_ORDER } from '@/generator/pieces/stages';
import type { PieceStage } from '@/generator/pieces/piece-types';

type Props = {
  stage: PieceStage;
  articleStatus: string | null;
  viewing: PieceStage;
  onView: (stage: PieceStage) => void;
};

export default function StageRail({ stage, articleStatus, viewing, onView }: Props) {
  const t = useTranslations('admin.studio');
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm">
      {STAGE_ORDER.map((key, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li key={key} className="flex items-center gap-1">
            <button
              type="button"
              disabled={index > current}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onView(key)}
              className={`rounded-full px-3 py-1 ${viewing === key ? 'ring-2 ring-slate-900' : ''} ${
                isCurrent ? 'bg-slate-900 text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? '✓ ' : ''}{t(`stages.${key}`)}
              {key === 'handed_off' && articleStatus && (
                <small className="ml-1">{t(`pieces.tracked.${articleStatus}`)}</small>
              )}
            </button>
            {index < STAGE_ORDER.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { PieceStage } from '@/generator/pieces/piece-types';
import { STEPS, canOpen, stepIndex, stepOf, type Step } from './steps';

/** The four steps, numbered because they are a sequence. */
export default function StepNav({
  stage,
  viewing,
  onView,
}: {
  stage: PieceStage;
  viewing: Step;
  onView: (step: Step) => void;
}) {
  const t = useTranslations('admin.studio');
  const current = stepIndex(stepOf(stage));
  const sent = stage === 'handed_off';
  return (
    <ol
      className="flex items-center overflow-x-auto py-1"
      aria-label={t('steps.label')}
    >
      {STEPS.map((step, i) => {
        const done = i < current || sent;
        const open = canOpen(step, stage);
        const active = viewing === step;
        return (
          <li key={step} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className={`mx-1 h-px w-5 sm:w-8 ${i <= current ? 'bg-emerald-300' : 'bg-slate-200'}`}
                aria-hidden
              />
            )}
            <button
              type="button"
              disabled={!open}
              aria-current={active ? 'step' : undefined}
              title={open ? undefined : t('steps.notYet')}
              onClick={() => onView(step)}
              className={`group flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40 ${
                active
                  ? 'font-semibold text-slate-900'
                  : open
                    ? 'font-medium text-slate-500 hover:text-slate-900'
                    : 'cursor-not-allowed font-medium text-slate-400'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-shadow ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : i === current
                      ? 'bg-primaryColor text-white'
                      : 'bg-slate-200 text-slate-500'
                } ${active ? (done ? 'ring-4 ring-emerald-500/15' : i === current ? 'ring-4 ring-primaryColor/20' : 'ring-4 ring-slate-300/40') : ''}`}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              {t(`steps.${step}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

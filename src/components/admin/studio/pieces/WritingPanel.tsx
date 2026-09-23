'use client';

import { useTranslations } from 'next-intl';
import type { PanelProps } from './panel-props';

export default function WritingPanel({ piece }: PanelProps) {
  const t = useTranslations('admin.studio');
  const steps = piece.activeRun?.kind === 'write' ? piece.activeRun.steps : [];
  const sections = steps.filter((s) => s.key.startsWith('section:'));
  const current = sections.findIndex((s) => s.status === 'running');
  const finishing = steps.some((s) => s.key === 'finish' && s.status === 'running');
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('writing.title')}</h3>
      {sections.length > 0 && !finishing && (
        <p className="text-sm text-slate-700">{t('writing.section', { n: (current === -1 ? sections.length : current + 1), total: piece.activeRun?.targets ?? piece.outline.length })}</p>
      )}
      {finishing && <p className="text-sm text-slate-700">{t('writing.finishing')}</p>}
      <ol className="space-y-1 text-sm">
        {piece.outline.map((o) => {
          const done = piece.sections.some((s) => s.outlineId === o.id) && !o.stale;
          return <li key={o.id} className={done ? 'text-emerald-700' : 'text-slate-500'}>{done ? '✓' : '○'} {o.heading}</li>;
        })}
      </ol>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createDraftPostAction, startRunAction } from '@/actions/studio-pieces';
import { sectionPlainText, type EnBlock } from '@/generator/pieces/piece-types';
import type { StudioResult } from '@/lib/studio/action-types';
import type { PanelProps } from './panel-props';
import { errorText } from './errorText';

function enText(block: EnBlock): string {
  switch (block.type) {
    case 'paragraph': case 'quote': case 'heading3': return block.text;
    case 'callout': return [block.title, block.text].filter(Boolean).join('\n');
    case 'list': return block.items.map((i) => `• ${i}`).join('\n');
    case 'table': return [block.headers.join(' | '), ...block.rows.map((r) => r.join(' | '))].join('\n');
  }
}

export default function TranslatePanel({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [message, setMessage] = useState<string | null>(null);
  async function act(promise: Promise<StudioResult<unknown>>) {
    const r = await promise;
    if (!r.ok) setMessage(errorText(t, r));
    await refresh();
  }
  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-slate-900">{t('translate.title')}</h3>
      {piece.titleEn && <p className="text-sm text-slate-600">{piece.title} / {piece.titleEn}</p>}
      {piece.sections.map((s) => (
        <div key={s.outlineId} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
          <div className="whitespace-pre-line text-slate-800">{sectionPlainText(s)}</div>
          <div className="whitespace-pre-line text-slate-800">
            {s.en && !s.enStale
              ? [s.en.heading, ...s.en.blocks.map(enText)].join('\n\n')
              : <span className="text-amber-700">{t('translate.stale')}</span>}
          </div>
        </div>
      ))}
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void act(startRunAction(piece.id, 'translate'))} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('review.translate')}</button>
        <button type="button" disabled={busy} onClick={() => void act(createDraftPostAction(piece.id))} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('review.handoff')}</button>
      </div>
    </section>
  );
}

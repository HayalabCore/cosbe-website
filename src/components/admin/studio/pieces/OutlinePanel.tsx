'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveOutlineAction, startRunAction } from '@/actions/studio-pieces';
import type { OutlineSection } from '@/generator/pieces/piece-types';
import type { PanelProps } from './panel-props';
import { useStudioAction } from './useStudioAction';

type Row = Omit<OutlineSection, 'id' | 'stale'> & { id?: string; stale: boolean };

export default function OutlinePanel({ piece, busy, locked = false, refresh, notify }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [rows, setRows] = useState<Row[]>(piece.outline);
  const { run, pending, message } = useStudioAction(refresh, notify);
  const disabled = busy || locked || pending;

  function update(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function move(index: number, delta: number) {
    setRows((r) => {
      const next = [...r];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });
  }

  const save = () =>
    run(() =>
      saveOutlineAction(piece.id, rows.map(({ id, heading, intent, chunkIds, kind, estChars }) => ({
        id, heading, intent, chunkIds, kind, estChars,
      })))
    );

  async function write() {
    const edited = JSON.stringify(rows) !== JSON.stringify(piece.outline);
    await run(async () => {
      if (edited) {
        const saved = await saveOutlineAction(piece.id, rows.map(({ id, heading, intent, chunkIds, kind, estChars }) => ({
          id, heading, intent, chunkIds, kind, estChars,
        })));
        if (!saved.ok) return saved;
      }
      return startRunAction(piece.id, 'write');
    });
  }
  // A failed or cancelled write lands here with its finished sections kept;
  // writing again only does the missing and stale ones.
  const resumes = piece.sections.length > 0;

  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('outline.title')}</h3>
      {piece.gaps.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">{t('outline.gaps')}</p>
          <ul className="list-disc pl-5">{piece.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      )}
      <ol className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id ?? `new-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="block text-sm">{t('outline.heading')}<input value={row.heading} disabled={disabled} onChange={(e) => update(index, { heading: e.target.value })} className={field} /></label>
            <label className="mt-2 block text-sm">{t('outline.intent')}<input value={row.intent} disabled={disabled} onChange={(e) => update(index, { intent: e.target.value })} className={field} /></label>
            <p className="mt-2 text-xs text-slate-500">
              {row.kind === 'boilerplate' ? t('outline.boilerplate') : t('outline.sources', { count: row.chunkIds.length })}
              {row.stale && ` · ${t('outline.stale')}`}
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)}>{t('outline.up')}</button>
              <button type="button" disabled={disabled || index === rows.length - 1} onClick={() => move(index, 1)}>{t('outline.down')}</button>
              <button type="button" disabled={disabled} onClick={() => setRows((r) => r.filter((_, i) => i !== index))} className="text-red-600">{t('outline.remove')}</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" disabled={disabled} onClick={() => setRows((r) => [...r, { heading: '', intent: '', chunkIds: [], estChars: 200, kind: 'boilerplate', stale: false }])} className="text-sm text-slate-700 underline">
        {t('outline.add')}
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={() => void save()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('outline.save')}</button>
        <button type="button" disabled={disabled || rows.length === 0} onClick={() => void write()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t(resumes ? 'outline.continue' : 'outline.write')}</button>
      </div>
    </section>
  );
}

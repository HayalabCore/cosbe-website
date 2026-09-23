'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listPieceChoicesAction, updatePieceSetupAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';
import { useStudioAction } from './useStudioAction';

type Choice = { id: string; title: string; status: string; kind: string; chapters: Array<{ title: string }> };

export default function SourcesPanel({ piece, busy: running, locked = false, refresh, notify }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [sources, setSources] = useState<Choice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string[]>(piece.selection.sourceIds);
  const [chapters, setChapters] = useState<Record<string, number[]>>(piece.selection.chapters);
  const { run, pending, message } = useStudioAction(refresh, notify);
  const busy = running || locked || pending;

  useEffect(() => {
    void listPieceChoicesAction(piece.id).then((r) => {
      if (r.ok) {
        setSources(r.data.sources);
        // Sources unlinked since they were selected cannot be shown or unticked.
        const listed = new Set(r.data.sources.map((s) => s.id));
        setSelected((s) => s.filter((id) => listed.has(id)));
      }
      setLoaded(true);
    });
  }, [piece.id]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setChapters((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }
  function toggleChapter(sourceId: string, index: number, count: number) {
    const current = chapters[sourceId] ?? Array.from({ length: count }, (_, i) => i);
    const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b);
    if (next.length === 0) {
      // No chapter left means the source is not used at all.
      toggle(sourceId);
      return;
    }
    setChapters((c) => ({ ...c, [sourceId]: next }));
  }

  function save() {
    const kept = Object.fromEntries(Object.entries(chapters).filter(([id]) => selected.includes(id)));
    return run(() => updatePieceSetupAction(piece.id, { selection: { sourceIds: selected, chapters: kept } }));
  }

  if (!loaded) return null;
  if (sources.length === 0) return <p className="text-sm text-slate-500">{t('sourcesPanel.none')}</p>;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('sourcesPanel.title')}</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {sources.map((s) => (
          <li key={s.id} className="px-4 py-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={s.status !== 'ready' || busy} checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="font-medium text-slate-900">{s.title}</span>
              {s.status !== 'ready' && <span className="text-xs text-slate-400">{t('sourcesPanel.notReady')}</span>}
            </label>
            {selected.includes(s.id) && s.chapters.length > 0 && (
              <ul className="ml-6 mt-2 space-y-1">
                {s.chapters.map((c, i) => (
                  <li key={i}>
                    <label className="flex items-center gap-2 text-slate-600">
                      <input type="checkbox" disabled={busy} checked={(chapters[s.id] ?? s.chapters.map((_, j) => j)).includes(i)} onChange={() => toggleChapter(s.id, i, s.chapters.length)} />
                      {c.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <button type="button" disabled={busy || selected.length === 0} onClick={() => void save()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">
        {t('sourcesPanel.next')}
      </button>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listSnapshotsAction, undoAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';

export default function HistoryList({ piece, busy, refresh }: PanelProps) {
  const t = useTranslations('admin.studio.workspace');
  const [items, setItems] = useState<Array<{ id: string; reason: string; createdAt: string }>>([]);
  useEffect(() => {
    void listSnapshotsAction(piece.id).then((r) => r.ok && setItems(r.data));
  }, [piece.id, piece.updatedAt]);
  const locked = piece.stage === 'handed_off';
  return (
    <section className="space-y-2 text-sm">
      <h3 className="font-semibold text-slate-900">{t('undo')}</h3>
      {items.length === 0 && <p className="text-slate-500">{t('noHistory')}</p>}
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-slate-600">{s.reason} · {new Date(s.createdAt).toLocaleTimeString()}</span>
            {!locked && (
              <button type="button" disabled={busy} onClick={() => void undoAction(piece.id, s.id).then(refresh)} className="shrink-0 text-xs underline">
                {t('undoButton')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

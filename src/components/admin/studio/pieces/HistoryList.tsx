'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listSnapshotsAction, undoAction } from '@/actions/studio-pieces';
import type { PanelProps } from './panel-props';
import { useStudioAction } from './useStudioAction';
import { historyLabel } from './errorText';

export default function HistoryList({ piece, busy, refresh, notify }: PanelProps) {
  const { run, pending, message } = useStudioAction(refresh, notify);
  const t = useTranslations('admin.studio.workspace');
  const ts = useTranslations('admin.studio');
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
            <span className="truncate text-slate-600">{historyLabel(ts, s.reason)} · {new Date(s.createdAt).toLocaleTimeString()}</span>
            {!locked && (
              <button type="button" disabled={busy || pending} onClick={() => void run(() => undoAction(piece.id, s.id))} className="shrink-0 text-xs underline">
                {t('undoButton')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </section>
  );
}

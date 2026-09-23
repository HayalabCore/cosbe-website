'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BookOpen, History, X } from 'lucide-react';
import { getChunksAction, undoAction } from '@/actions/studio-pieces';
import ConfirmDialog from '../ConfirmDialog';
import { Skeleton, relativeTime } from '../ui';
import { historyLabel } from './errorText';
import { useStudioAction } from './useStudioAction';
import { useWorkspace, type Snapshot } from './workspace-context';

export type Citation = {
  key: string;
  number: number;
  text: string;
  ids: string[];
};
type Chunk = { id: string; sourceTitle: string; text: string };

function CitationDetail({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  const t = useTranslations('admin.studio.draft');
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  useEffect(() => {
    let live = true;
    void getChunksAction(citation.ids).then(
      (r) => live && setChunks(r.ok ? r.data : [])
    );
    return () => {
      live = false;
    };
  }, [citation.ids]);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">
          {t('citationTitle', { n: citation.number })}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeCitation')}
          className="-m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <blockquote className="border-l-2 border-primaryColor pl-3 text-sm leading-relaxed text-slate-800">
        {citation.text}
      </blockquote>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">
          {t('citationFrom')}
        </p>
        {chunks === null ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          chunks.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-800">
                {c.sourceTitle}
              </p>
              <p className="max-h-72 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-slate-600">
                {c.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SourcesHelp({
  cited,
  transitions,
  flagged,
}: {
  cited: number;
  transitions: number;
  flagged: number;
}) {
  const t = useTranslations('admin.studio.draft');
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <p className="leading-relaxed">{t('railHelp')}</p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          [cited, t('statCited')],
          [transitions, t('statTransitions')],
          [flagged, t('statFlagged')],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2 py-2.5">
            <dd className="text-lg font-bold tabular-nums text-slate-900">
              {value}
            </dd>
            <dt className="text-[11px] leading-tight text-slate-500">
              {label}
            </dt>
          </div>
        ))}
      </dl>
      <ul className="space-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-bold text-primaryDark">
            1
          </span>
          {t('legendCited')}
        </li>
        <li className="flex items-center gap-2">
          <span className="underline decoration-slate-400 decoration-dotted underline-offset-4">
            あ
          </span>
          {t('legendTransition')}
        </li>
      </ul>
    </div>
  );
}

function HistoryPanel() {
  const t = useTranslations('admin.studio');
  const locale = useLocale();
  const { piece, busy, locked, refresh, notify, snapshots } = useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  const [restoring, setRestoring] = useState<Snapshot | null>(null);
  if (snapshots.length === 0)
    return <p className="text-sm text-slate-500">{t('workspace.noHistory')}</p>;
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        {t('history.help')}
      </p>
      <ol className="space-y-1">
        {snapshots.map((s) => (
          <li
            key={s.id}
            className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
          >
            <span className="min-w-0">
              <span
                className="block truncate text-sm text-slate-700"
                title={historyLabel(t, s.reason)}
              >
                {historyLabel(t, s.reason)}
              </span>
              <span
                className="text-xs text-slate-400"
                title={new Date(s.createdAt).toLocaleString(locale)}
              >
                {relativeTime(s.createdAt, locale)}
              </span>
            </span>
            {!locked && (
              <button
                type="button"
                disabled={busy || pending}
                onClick={() => setRestoring(s)}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primaryDark opacity-0 hover:bg-blue-50 focus:opacity-100 group-hover:opacity-100 disabled:text-slate-300"
              >
                {t('history.restore')}
              </button>
            )}
          </li>
        ))}
      </ol>
      {restoring && (
        <ConfirmDialog
          title={t('history.confirmTitle')}
          confirmLabel={t('history.restore')}
          busy={pending}
          onClose={() => setRestoring(null)}
          onConfirm={() => {
            void run(() => undoAction(piece.id, restoring.id)).then(() =>
              setRestoring(null)
            );
          }}
        >
          <p>
            {t('history.confirmBody', {
              label: historyLabel(t, restoring.reason),
            })}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

/** The draft's side panel: where a sentence comes from, and earlier versions. */
export default function DraftRail({
  citation,
  onCloseCitation,
  stats,
}: {
  citation: Citation | null;
  onCloseCitation: () => void;
  stats: { cited: number; transitions: number; flagged: number };
}) {
  const t = useTranslations('admin.studio.draft');
  const [tab, setTab] = useState<'sources' | 'history'>('sources');
  const shown = citation ? 'sources' : tab;
  const tabs = [
    { key: 'sources' as const, icon: BookOpen, label: t('tabSources') },
    { key: 'history' as const, icon: History, label: t('tabHistory') },
  ];
  return (
    <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div
          role="tablist"
          className="flex gap-1 border-b border-slate-100 p-1.5"
        >
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={shown === key}
              onClick={() => {
                if (key === 'history') onCloseCitation();
                setTab(key);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${shown === key ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {shown === 'history' ? (
            <HistoryPanel />
          ) : citation ? (
            <CitationDetail
              key={citation.key}
              citation={citation}
              onClose={onCloseCitation}
            />
          ) : (
            <SourcesHelp {...stats} />
          )}
        </div>
      </div>
    </aside>
  );
}

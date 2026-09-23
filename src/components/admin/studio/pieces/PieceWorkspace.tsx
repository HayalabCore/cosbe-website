'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { cancelRunAction, listSnapshotsAction } from '@/actions/studio-pieces';
import { EmptyState, Skeleton } from '../ui';
import { errorText } from './errorText';
import StepNav from './StepNav';
import { stepOf, type Step } from './steps';
import { usePiece } from './usePiece';
import { WorkspaceProvider, type Snapshot } from './workspace-context';
import SetupStep from './SetupStep';
import OutlineStep from './OutlineStep';
import DraftStep from './DraftStep';
import HandoffStep from './HandoffStep';

function LoadingWorkspace() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 px-6 py-8"
      role="status"
      aria-busy
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-7 w-96 max-w-full" />
      <Skeleton className="h-8 w-[28rem] max-w-full rounded-full" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function PieceWorkspace({ pieceId }: { pieceId: string }) {
  const t = useTranslations('admin.studio');
  const { piece, refresh, error } = usePiece(pieceId);
  const [picked, setPicked] = useState<{ at: string; step: Step } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const version = piece?.updatedAt;
  useEffect(() => {
    if (!version) return;
    void listSnapshotsAction(pieceId).then((r) => r.ok && setSnapshots(r.data));
  }, [pieceId, version]);

  if (!piece) {
    if (!error) return <LoadingWorkspace />;
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState
          title={t(
            error === 'NOT_FOUND'
              ? 'workspace.notFound'
              : 'workspace.errors.FAILED'
          )}
          action={
            <Link
              href="/admin/studio"
              className="text-sm font-semibold text-primaryDark underline"
            >
              {t('workspace.back')}
            </Link>
          }
        />
      </div>
    );
  }

  // A choice made for one stage lapses when the stage moves on, so a finished
  // run always brings its result into view.
  // A running job is shown where its result will appear: an outline run on
  // the Outline step (still empty, with placeholders) rather than on Setup.
  const producing =
    piece.activeRun?.kind === 'outline' ? 'outline' : stepOf(piece.stage);
  const viewing = picked && picked.at === piece.stage ? picked.step : producing;
  const go = (step: Step) => setPicked({ at: piece.stage, step });
  const busy = Boolean(piece.activeRun);

  async function cancel() {
    try {
      const result = await cancelRunAction(pieceId);
      setNotice(result.ok ? null : errorText(t, result));
    } catch {
      setNotice(errorText(t, { error: 'FAILED' }));
    }
    await refresh();
  }

  // Steps copy the piece into local state; a new version (restore, save, run
  // output) must remount them instead of leaving stale edits to be saved.
  const key = `${viewing}:${piece.updatedAt}`;

  return (
    <WorkspaceProvider
      value={{
        piece,
        busy,
        locked: piece.stage === 'handed_off',
        refresh,
        notify: setNotice,
        notice,
        snapshots,
        cancel,
        go,
      }}
    >
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-6">
        <header className="mb-6 space-y-4">
          <nav
            className="flex items-center gap-1 text-sm text-slate-500"
            aria-label={t('workspace.breadcrumb')}
          >
            <Link
              href="/admin/studio"
              className="inline-flex items-center gap-0.5 rounded hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {t('workspace.back')}
            </Link>
            <span aria-hidden className="text-slate-300">
              /
            </span>
            <Link
              href={`/admin/studio/projects/${piece.projectId}`}
              className="truncate hover:text-slate-900"
            >
              {piece.projectName}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1
              className={`min-w-0 max-w-3xl truncate text-xl font-bold ${piece.title ? 'text-slate-900' : 'text-slate-400'}`}
            >
              {piece.title || t('pieces.untitled')}
            </h1>
            <StepNav stage={piece.stage} viewing={viewing} onView={go} />
          </div>
          {error && (
            <p className="text-xs text-amber-700">{t('workspace.stale')}</p>
          )}
        </header>
        {viewing === 'setup' && <SetupStep key={key} />}
        {viewing === 'outline' && <OutlineStep key={key} />}
        {viewing === 'draft' && <DraftStep key={key} />}
        {viewing === 'handoff' && <HandoffStep key={key} />}
      </div>
    </WorkspaceProvider>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { cancelRunAction, listSnapshotsAction } from '@/actions/studio-pieces';
import { Badge, EmptyState, Skeleton } from '../ui';
import { errorText } from './errorText';
import StepNav from './StepNav';
import TitleEditor from './TitleEditor';
import ArchivedBanner from './ArchivedBanner';
import { stepOf, type Step } from './steps';
import { usePiece } from './usePiece';
import { WorkspaceProvider, type Snapshot } from './workspace-context';
import type { PieceDTO } from '@/lib/studio/piece-dto';
import SetupStep from './SetupStep';
import OutlineStep from './OutlineStep';
import DraftStep from './DraftStep';
import HandoffStep from './HandoffStep';

/**
 * A short fingerprint of everything the steps hold in local state. The title
 * (edited in the header) and live run status are left out on purpose.
 */
function contentVersion(piece: PieceDTO): string {
  const content = {
    ...piece,
    title: null,
    updatedAt: null,
    activeRun: null,
    lastRunError: null,
  };
  const text = JSON.stringify(content);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

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

  // Steps copy the piece into local state; a new version of what they edit
  // (restore, save, run output) must remount them instead of leaving stale
  // edits to be saved. A title rename is not such a version: remounting on it
  // would throw away the step's unsaved changes.
  const key = `${viewing}:${contentVersion(piece)}`;

  return (
    <WorkspaceProvider
      value={{
        piece,
        busy,
        locked: piece.stage === 'handed_off' || Boolean(piece.archivedAt),
        refresh,
        notify: setNotice,
        notice,
        snapshots,
        cancel,
        go,
      }}
    >
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-6">
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
              href={`/admin/studio/topics/${piece.projectId}`}
              className="truncate hover:text-slate-900"
            >
              {piece.projectName}
            </Link>
          </nav>
          {/* One row on desktop: the title takes what the steps leave and
              truncates, so a long title never pushes the page down. */}
          <div className="flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap lg:gap-8">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TitleEditor />
              {/* The outline proposes a title; the draft writes the final one. */}
              {piece.title && piece.excerpt === null && (
                <span
                  className="shrink-0"
                  title={t('workspace.workingTitleHint')}
                >
                  <Badge>{t('workspace.workingTitle')}</Badge>
                </span>
              )}
            </div>
            <div className="shrink-0">
              <StepNav stage={piece.stage} viewing={viewing} onView={go} />
            </div>
          </div>
          {error && (
            <p className="text-xs text-amber-700">{t('workspace.stale')}</p>
          )}
          {piece.archivedAt && <ArchivedBanner />}
        </header>
        {viewing === 'setup' && <SetupStep key={key} />}
        {viewing === 'outline' && <OutlineStep key={key} />}
        {viewing === 'draft' && <DraftStep key={key} />}
        {viewing === 'handoff' && <HandoffStep key={key} />}
      </div>
    </WorkspaceProvider>
  );
}

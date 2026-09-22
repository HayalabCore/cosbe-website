'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cancelRunAction } from '@/actions/studio-pieces';
import type { PieceStage } from '@/generator/pieces/piece-types';
import StageRail from './StageRail';
import { usePiece } from './usePiece';
import SourcesPanel from './SourcesPanel';
import BriefPanel from './BriefPanel';
import OutlinePanel from './OutlinePanel';
import WritingPanel from './WritingPanel';
import ReviewPanel from './ReviewPanel';
import TranslatePanel from './TranslatePanel';
import HandoffPanel from './HandoffPanel';
import HistoryList from './HistoryList';

export default function PieceWorkspace({ pieceId }: { pieceId: string }) {
  const t = useTranslations('admin.studio');
  const { piece, refresh, error } = usePiece(pieceId);
  const [picked, setPicked] = useState<{ at: PieceStage; view: PieceStage } | null>(null);

  if (!piece) {
    return error ? <p className="text-sm text-red-600">{t('workspace.errors.FAILED')}</p> : null;
  }
  const viewing = picked && picked.at === piece.stage ? picked.view : piece.stage;
  const setViewing = (view: PieceStage) => setPicked({ at: piece.stage, view });
  const busy = Boolean(piece.activeRun);
  const panel = { piece, busy, refresh };

  return (
    <div className="space-y-5">
      <Link href="/admin/studio" className="text-sm text-slate-500">← {t('workspace.back')}</Link>
      <h2 className="text-xl font-semibold text-slate-900">{piece.title || t('pieces.untitled')}</h2>
      <StageRail stage={piece.stage} articleStatus={piece.article?.status ?? (piece.articleId ? 'removed' : null)} viewing={viewing} onView={setViewing} />
      {busy && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
          <span>{t('workspace.busy')}</span>
          <button type="button" onClick={() => void cancelRunAction(piece.id).then(refresh)} className="underline">
            {t('workspace.cancel')}
          </button>
        </div>
      )}
      {!busy && piece.lastRunError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{t('workspace.failed', { error: piece.lastRunError })}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <main>
          {viewing === 'sources' && <SourcesPanel {...panel} />}
          {viewing === 'brief' && <BriefPanel {...panel} />}
          {viewing === 'outline' && <OutlinePanel {...panel} />}
          {viewing === 'writing' && <WritingPanel {...panel} />}
          {viewing === 'review' && <ReviewPanel {...panel} />}
          {(viewing === 'translating' || viewing === 'ready') && <TranslatePanel {...panel} />}
          {viewing === 'handed_off' && <HandoffPanel {...panel} />}
        </main>
        <aside>
          <HistoryList {...panel} />
        </aside>
      </div>
    </div>
  );
}

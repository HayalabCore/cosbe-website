'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { updatePieceMetaAction } from '@/actions/studio-pieces';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

const TITLE_CLASS = 'text-xl font-bold';
/*
 * The padding that gives the hover and edit states room is taken back with a
 * negative margin on the outer element, so the text stays aligned with the
 * breadcrumb and the heading measures its full content (no false truncation).
 */

/** The piece title, editable in place whenever the piece is. */
export default function TitleEditor() {
  const t = useTranslations('admin.studio');
  const { piece, busy, locked, refresh, notify } = useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  const [draft, setDraft] = useState<string | null>(null);
  const editable = !busy && !locked && !pending;

  async function save() {
    const title = draft?.trim() ?? '';
    setDraft(null);
    if (title && title !== piece.title)
      await run(() => updatePieceMetaAction(piece.id, { title }));
  }

  if (draft !== null)
    return (
      <input
        autoFocus
        value={draft}
        maxLength={200}
        aria-label={t('draft.editTitle')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDraft(null);
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void save();
          }
        }}
        className={`${TITLE_CLASS} -ml-2 w-[36rem] max-w-full rounded-lg border border-primaryColor bg-white px-2 py-0.5 text-slate-900 outline-none ring-2 ring-primaryColor/15`}
      />
    );

  const title = piece.title || t('pieces.untitled');
  const tone = piece.title ? 'text-slate-900' : 'text-slate-400';
  if (!editable)
    return (
      <h1 className={`${TITLE_CLASS} ${tone} min-w-0 truncate`}>{title}</h1>
    );
  return (
    <h1 className={`${TITLE_CLASS} ${tone} -ml-2 flex min-w-0`}>
      <button
        type="button"
        title={t('draft.editTitle')}
        onClick={() => setDraft(piece.title)}
        className="group inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40"
      >
        <span className="truncate">{title}</span>
        <Pencil
          className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 group-focus-visible:text-slate-500"
          aria-hidden
        />
      </button>
    </h1>
  );
}

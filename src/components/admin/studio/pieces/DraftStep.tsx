'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, Sparkles, Undo2 } from 'lucide-react';
import {
  editSentenceAction,
  rewriteSectionAction,
  startRunAction,
  undoAction,
  updatePieceMetaAction,
} from '@/actions/studio-pieces';
import type {
  Section,
  Sentence,
  StudioBlock,
} from '@/generator/pieces/piece-types';
import { Banner, Skeleton } from '../ui';
import CommandBar, { BarPrimary } from './CommandBar';
import DraftRail, { type Citation } from './DraftRail';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

const REWRITES = ['regenerate', 'expand', 'shorten', 'formal'] as const;

type Edit = (
  outlineId: string,
  block: number,
  index: number,
  text: string
) => Promise<boolean>;

type DocContext = {
  editable: boolean;
  citation: Citation | null;
  showCitation: (c: Citation) => void;
  editing: string | null;
  setEditing: (key: string | null) => void;
  edit: Edit;
  numbers: Map<string, number>;
};

function sentencesOf(block: StudioBlock): Sentence[] {
  if (block.type === 'list') return block.items;
  if (
    block.type === 'paragraph' ||
    block.type === 'quote' ||
    block.type === 'callout'
  )
    return block.sentences;
  return [];
}

/** Citation numbers in reading order across the whole article. */
function numberCitations(sections: Section[]): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const s of sections)
    s.blocks.forEach((b, bi) =>
      sentencesOf(b).forEach((sentence, si) => {
        if (sentence.cite.length > 0)
          numbers.set(`${s.outlineId}:${bi}:${si}`, (n += 1));
      })
    );
  return numbers;
}

/** A textarea that grows with its text. Enter saves, Escape cancels. */
function InlineEditor({
  initial,
  onSave,
  onCancel,
  multiline = true,
  className = '',
}: {
  initial: string;
  onSave: (text: string) => Promise<boolean> | void;
  onCancel: () => void;
  multiline?: boolean;
  className?: string;
}) {
  const t = useTranslations('admin.studio.draft');
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  async function save() {
    const value = text.trim();
    if (!value || value === initial.trim()) return onCancel();
    setSaving(true);
    const ok = await onSave(value);
    if (ok === false) setSaving(false);
  }
  return (
    <span className="my-1 block rounded-lg bg-white shadow-sm ring-2 ring-primaryColor/40">
      <textarea
        ref={ref}
        value={text}
        rows={1}
        disabled={saving}
        aria-label={t('editLabel')}
        onChange={(e) =>
          setText(
            multiline ? e.target.value : e.target.value.replace(/\n/g, '')
          )
        }
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void save();
          }
        }}
        className={`block w-full resize-none overflow-hidden rounded-t-lg border-0 bg-transparent px-3 py-2 focus:outline-none ${className}`}
      />
      <span className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">
        <span>{t('editKeys')}</span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 font-semibold hover:bg-slate-100"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-primaryColor px-2 py-1 font-semibold text-white hover:bg-primaryHover"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {t('save')}
          </button>
        </span>
      </span>
    </span>
  );
}

function SentenceView({
  sentence,
  at,
  doc,
}: {
  sentence: Sentence;
  at: string;
  doc: DocContext;
}) {
  const t = useTranslations('admin.studio.draft');
  const [outlineId, block, index] = at.split(':');
  const number = doc.numbers.get(at);
  if (doc.editing === at)
    return (
      <InlineEditor
        initial={sentence.text}
        onCancel={() => doc.setEditing(null)}
        onSave={(text) =>
          doc.edit(outlineId, Number(block), Number(index), text)
        }
      />
    );
  const active = doc.citation?.key === at;
  return (
    <span
      className={`rounded-sm transition-colors ${active ? 'bg-blue-100/70' : ''}`}
    >
      <span
        role={doc.editable ? 'button' : undefined}
        tabIndex={doc.editable ? 0 : undefined}
        title={
          sentence.connective
            ? t('transitionTitle')
            : doc.editable
              ? t('clickToEdit')
              : undefined
        }
        onClick={doc.editable ? () => doc.setEditing(at) : undefined}
        onKeyDown={(e) => {
          if (doc.editable && e.key === 'Enter') doc.setEditing(at);
        }}
        className={`${doc.editable ? 'cursor-text rounded-sm hover:bg-amber-50 focus-visible:bg-amber-50 focus-visible:outline-none' : ''} ${sentence.connective ? 'underline decoration-slate-300 decoration-dotted underline-offset-[6px]' : ''}`}
      >
        {sentence.text}
      </span>
      {number && (
        <sup>
          <button
            type="button"
            aria-label={t('citationLabel', { n: number })}
            aria-pressed={active}
            onClick={() =>
              doc.showCitation({
                key: at,
                number,
                text: sentence.text,
                ids: sentence.cite,
              })
            }
            className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 align-[1px] text-[10px] font-bold leading-none tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/50 ${active ? 'bg-primaryColor text-white' : 'bg-blue-100 text-primaryDark hover:bg-primaryColor hover:text-white'}`}
          >
            {number}
          </button>
        </sup>
      )}
    </span>
  );
}

function BlockView({
  block,
  at,
  doc,
}: {
  block: StudioBlock;
  at: string;
  doc: DocContext;
}) {
  const sentences = (list: Sentence[]) =>
    list.map((s, i) => (
      <SentenceView key={i} sentence={s} at={`${at}:${i}`} doc={doc} />
    ));
  switch (block.type) {
    case 'paragraph':
      return <p>{sentences(block.sentences)}</p>;
    case 'quote':
      return (
        <blockquote className="border-l-4 border-slate-200 pl-4 text-slate-600">
          {sentences(block.sentences)}
        </blockquote>
      );
    case 'callout':
      return (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
          {block.title && (
            <p className="mb-1 font-semibold text-slate-900">{block.title}</p>
          )}
          {sentences(block.sentences)}
        </div>
      );
    case 'list':
      return (
        <ul className="list-disc space-y-1 pl-6 marker:text-slate-400">
          {block.items.map((item, i) => (
            <li key={i}>
              <SentenceView sentence={item} at={`${at}:${i}`} doc={doc} />
            </li>
          ))}
        </ul>
      );
    case 'heading3':
      return (
        <h3 className="pt-2 text-base font-semibold text-slate-900">
          {block.text}
        </h3>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** "Rewrite" menu: the common instructions, or the editor's own. */
function RewriteMenu({
  disabled,
  onRewrite,
}: {
  disabled: boolean;
  onRewrite: (instruction: string) => void;
}) {
  const t = useTranslations('admin.studio.review');
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !ref.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setCustom(null);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const pick = (instruction: string) => {
    setOpen(false);
    setCustom(null);
    onRewrite(instruction);
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t('rewrite')}
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {custom === null ? (
            <>
              {REWRITES.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="menuitem"
                  onClick={() => pick(t(`instructions.${a}`))}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t(`actions.${a}`)}
                </button>
              ))}
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => setCustom('')}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {t('actions.custom')}
              </button>
            </>
          ) : (
            <form
              className="space-y-2 p-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) pick(custom.trim());
              }}
            >
              <label
                className="block text-xs font-semibold text-slate-600"
                htmlFor="rewrite-custom"
              >
                {t('customPrompt')}
              </label>
              <textarea
                id="rewrite-custom"
                autoFocus
                rows={3}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={t('customPlaceholder')}
                className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
              />
              <button
                type="submit"
                disabled={!custom.trim()}
                className="w-full rounded-lg bg-primaryColor px-3 py-1.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:bg-slate-200 disabled:text-slate-400"
              >
                {t('customSubmit')}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function SectionView({
  section,
  doc,
  rewriting,
  undo,
  onRewrite,
}: {
  section: Section;
  doc: DocContext;
  rewriting: boolean;
  undo: ReactNode;
  onRewrite: (instruction: string) => void;
}) {
  const t = useTranslations('admin.studio');
  return (
    <section
      className="group/section relative scroll-mt-24"
      aria-busy={rewriting || undefined}
    >
      <header className="mb-3 flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold leading-snug text-slate-900">
          {section.heading}
        </h2>
        {doc.editable && (
          <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover/section:opacity-100">
            <RewriteMenu disabled={rewriting} onRewrite={onRewrite} />
          </div>
        )}
      </header>
      {undo}
      {section.flags.length > 0 && (
        <div className="mb-3">
          <Banner tone="warning" title={t('review.flags')}>
            <ul className="list-disc pl-4 text-xs">
              {section.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Banner>
        </div>
      )}
      <div
        className={`space-y-4 transition-opacity ${rewriting ? 'opacity-40' : ''}`}
      >
        {section.blocks.map((block, i) => (
          <BlockView
            key={i}
            block={block}
            at={`${section.outlineId}:${i}`}
            doc={doc}
          />
        ))}
      </div>
    </section>
  );
}

function PendingSection({
  heading,
  active,
}: {
  heading: string;
  active: boolean;
}) {
  const t = useTranslations('admin.studio.draft');
  return (
    <section aria-busy={active || undefined}>
      <h2
        className={`mb-3 flex items-center gap-2 text-lg font-bold ${active ? 'text-slate-900' : 'text-slate-400'}`}
      >
        {heading}
        {active && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primaryDark">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            {t('writingNow')}
          </span>
        )}
      </h2>
      <div className={`space-y-2.5 ${active ? '' : 'opacity-50'}`}>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </section>
  );
}

/** Title or excerpt, edited where it is shown. */
function EditableMeta({
  value,
  placeholder,
  editable,
  className,
  onSave,
  label,
}: {
  value: string;
  placeholder: string;
  editable: boolean;
  className: string;
  label: string;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <InlineEditor
        initial={value}
        multiline={false}
        className={className}
        onCancel={() => setEditing(false)}
        onSave={onSave}
      />
    );
  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? label : undefined}
      onClick={editable ? () => setEditing(true) : undefined}
      onKeyDown={(e) => editable && e.key === 'Enter' && setEditing(true)}
      className={`${className} ${editable ? '-mx-2 cursor-text rounded-lg px-2 hover:bg-amber-50 focus-visible:bg-amber-50 focus-visible:outline-none' : ''} ${value ? '' : 'text-slate-400'}`}
    >
      {value || placeholder}
    </div>
  );
}

export default function DraftStep() {
  const t = useTranslations('admin.studio');
  const { piece, busy, locked, refresh, notify, snapshots, go } =
    useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  const [citation, setCitation] = useState<Citation | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const editable = !busy && !locked && !pending;

  const writeRun = piece.activeRun?.kind === 'write' ? piece.activeRun : null;
  const rewriteRun =
    piece.activeRun?.kind === 'rewrite_section' ? piece.activeRun : null;
  const runningSection = writeRun?.steps
    .find((s) => s.key.startsWith('section:') && s.status === 'running')
    ?.key.slice(8);
  const written = new Map(piece.sections.map((s) => [s.outlineId, s]));

  const doc: DocContext = {
    editable,
    citation,
    showCitation: (c) => setCitation((cur) => (cur?.key === c.key ? null : c)),
    editing,
    setEditing,
    numbers: numberCitations(piece.sections),
    edit: (outlineId, block, index, text) =>
      run(() =>
        editSentenceAction(piece.id, { outlineId, block, index, text })
      ).then((ok) => {
        if (ok) setEditing(null);
        return ok;
      }),
  };

  const all = piece.sections.flatMap((s) => s.blocks.flatMap(sentencesOf));
  const stats = {
    cited: all.filter((s) => s.cite.length > 0).length,
    transitions: all.filter((s) => s.connective).length,
    flagged: piece.sections.filter((s) => s.flags.length > 0).length,
  };

  // The newest version was taken just before a rewrite: offer to take it back
  // right where the change happened.
  const latest = snapshots[0];
  const rewrittenHeading = latest?.reason.startsWith('rewrite:')
    ? latest.reason.slice(8)
    : null;
  const saveMeta = (patch: { title?: string; excerpt?: string }) =>
    run(() => updatePieceMetaAction(piece.id, patch));
  const complete =
    piece.stage === 'review' ||
    piece.stage === 'ready' ||
    piece.stage === 'translating' ||
    piece.stage === 'handed_off';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {locked && (
        <div className="lg:col-span-2">
          <Banner tone="info">{t('draft.lockedHint')}</Banner>
        </div>
      )}
      <article className="rounded-xl border border-slate-200 bg-white px-6 py-8 sm:px-12 sm:py-12">
        <div className="mx-auto max-w-[42rem] space-y-10 text-[15px] leading-8 text-slate-800">
          <header className="space-y-3 border-b border-slate-100 pb-8">
            {piece.title || !writeRun ? (
              <EditableMeta
                value={piece.title}
                label={t('draft.editTitle')}
                placeholder={t('pieces.untitled')}
                editable={editable && piece.sections.length > 0}
                className="text-2xl font-bold leading-snug text-slate-900"
                onSave={(title) => saveMeta({ title })}
              />
            ) : (
              <Skeleton className="h-8 w-3/4" />
            )}
            {piece.excerpt !== null ? (
              <EditableMeta
                value={piece.excerpt}
                label={t('draft.editExcerpt')}
                placeholder={t('draft.noExcerpt')}
                editable={editable}
                className="text-sm leading-7 text-slate-500"
                onSave={(excerpt) => saveMeta({ excerpt })}
              />
            ) : (
              writeRun && (
                <p className="text-xs text-slate-400">
                  {t('draft.excerptLater')}
                </p>
              )
            )}
          </header>
          {piece.outline.map((o) => {
            const section = written.get(o.id);
            if (!section || (o.stale && writeRun))
              return (
                <PendingSection
                  key={o.id}
                  heading={o.heading}
                  active={runningSection === o.id}
                />
              );
            const rewriting = Boolean(rewriteRun);
            const showUndo = editable && rewrittenHeading === section.heading;
            return (
              <SectionView
                key={o.id}
                section={section}
                doc={doc}
                rewriting={rewriting}
                onRewrite={(instruction) =>
                  void run(() =>
                    rewriteSectionAction(piece.id, {
                      sectionId: section.outlineId,
                      instruction,
                    })
                  )
                }
                undo={
                  showUndo && (
                    <p className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                      {t('draft.rewritten')}
                      <button
                        type="button"
                        onClick={() =>
                          void run(() => undoAction(piece.id, latest.id))
                        }
                        className="inline-flex items-center gap-1 font-semibold underline"
                      >
                        <Undo2 className="h-3 w-3" aria-hidden />
                        {t('draft.undoRewrite')}
                      </button>
                    </p>
                  )
                }
              />
            );
          })}
        </div>
      </article>

      <DraftRail
        citation={citation}
        onCloseCitation={() => setCitation(null)}
        stats={stats}
      />

      {locked ? null : (
        <CommandBar hint={complete ? t('draft.hint') : t('draft.incomplete')}>
          {complete ? (
            <BarPrimary onClick={() => go('handoff')}>
              {t('draft.toHandoff')}
            </BarPrimary>
          ) : (
            <BarPrimary
              busy={pending}
              onClick={() => void run(() => startRunAction(piece.id, 'write'))}
            >
              {t('outline.continue')}
            </BarPrimary>
          )}
        </CommandBar>
      )}
    </div>
  );
}

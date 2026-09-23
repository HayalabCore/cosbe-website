'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getChunksAction,
  saveOutlineAction,
  startRunAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import type { OutlineSection } from '@/generator/pieces/piece-types';
import { lengthShortfall } from '@/generator/pieces/stages';
import { Badge, Banner, Button, Skeleton } from '../ui';
import CommandBar, { BarButton, BarPrimary } from './CommandBar';
import { gapText } from './errorText';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

type Row = Omit<OutlineSection, 'id' | 'stale'> & {
  key: string;
  id?: string;
  stale: boolean;
};
type Chunk = { id: string; sourceTitle: string; text: string };

/** getChunksAction takes at most this many ids per call. */
const CHUNK_BATCH = 20;

let nextKey = 0;
const toRows = (outline: OutlineSection[]): Row[] =>
  outline.map((o) => ({ ...o, key: o.id }));
const toInput = (rows: Row[]) =>
  rows.map(({ id, heading, intent, chunkIds, kind, estChars }) => ({
    id,
    heading,
    intent,
    chunkIds,
    kind,
    estChars,
  }));

/** Sections only move up and down. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** Every passage the outline cites, loaded once for all cards. */
function useChunks(ids: string[]): Map<string, Chunk> | null {
  const key = [...new Set(ids)].sort().join(',');
  const [chunks, setChunks] = useState<{
    key: string;
    map: Map<string, Chunk>;
  } | null>(null);
  useEffect(() => {
    let live = true;
    const unique = key ? key.split(',') : [];
    const batches: string[][] = [];
    for (let i = 0; i < unique.length; i += CHUNK_BATCH)
      batches.push(unique.slice(i, i + CHUNK_BATCH));
    void Promise.all(batches.map((b) => getChunksAction(b))).then((results) => {
      if (!live) return;
      const map = new Map<string, Chunk>();
      for (const r of results)
        if (r.ok) for (const c of r.data) map.set(c.id, c);
      setChunks({ key, map });
    });
    return () => {
      live = false;
    };
  }, [key]);
  // Keep showing the last passages while a changed outline loads new ones.
  return chunks?.map ?? null;
}

type CardProps = {
  row: Row;
  number: number;
  chunks: Map<string, Chunk> | null;
  disabled: boolean;
  /** The section has written text that its changes will replace. */
  rewrites?: boolean;
  onChange?: (patch: Partial<Row>) => void;
  onRemove?: () => void;
  handle?: ReactNode;
  /** The lifted copy under the pointer while dragging. */
  lifted?: boolean;
};

function SectionCard({
  row,
  number,
  chunks,
  disabled,
  rewrites = false,
  onChange,
  onRemove,
  handle,
  lifted = false,
}: CardProps) {
  const t = useTranslations('admin.studio.outline');
  const [open, setOpen] = useState(false);
  const empty = !row.heading.trim();
  const cited = row.chunkIds
    .map((id) => chunks?.get(id))
    .filter((c): c is Chunk => Boolean(c));
  const sources = [...new Set(cited.map((c) => c.sourceTitle))];
  const noMaterial = row.kind === 'boilerplate' || row.chunkIds.length === 0;
  const readOnly = disabled || lifted;

  return (
    <div
      className={`group flex gap-3 rounded-xl border bg-white px-3 py-4 sm:px-4 ${
        lifted
          ? 'border-primaryColor shadow-xl ring-4 ring-primaryColor/10'
          : 'border-slate-200'
      }`}
    >
      {handle}
      <span className="mt-1 w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-400">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <input
          value={row.heading}
          disabled={readOnly}
          tabIndex={lifted ? -1 : undefined}
          aria-label={t('heading')}
          placeholder={t('headingPlaceholder')}
          onChange={(e) => onChange?.({ heading: e.target.value })}
          className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 ${empty ? 'border-amber-300' : ''}`}
        />
        <textarea
          value={row.intent}
          disabled={readOnly}
          tabIndex={lifted ? -1 : undefined}
          rows={1}
          aria-label={t('intent')}
          placeholder={t('intentPlaceholder')}
          onChange={(e) => onChange?.({ intent: e.target.value })}
          className="block w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-slate-600 [field-sizing:content] placeholder:text-slate-400 hover:border-slate-200 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 pt-1 text-xs text-slate-500">
          {noMaterial ? (
            <Badge title={t('boilerplateHint')}>{t('boilerplate')}</Badge>
          ) : (
            <button
              type="button"
              disabled={lifted}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md py-0.5 text-left font-medium text-primaryDark hover:underline"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {sources.length > 0
                  ? sources.join('、')
                  : t('sources', { count: row.chunkIds.length })}
              </span>
              {row.chunkIds.length > 1 && (
                <span className="shrink-0 text-slate-400">
                  {t('passageCount', { count: row.chunkIds.length })}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          )}
          <span className="tabular-nums">
            {t('estChars', { count: row.estChars })}
          </span>
          {rewrites && <Badge tone="amber">{t('stale')}</Badge>}
        </div>
        {open && !lifted && (
          <ul className="space-y-2 px-2 pt-2">
            {chunks === null
              ? [0, 1].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))
              : cited.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600"
                  >
                    <span className="mb-1 block font-semibold text-slate-800">
                      {c.sourceTitle}
                    </span>
                    <span className="line-clamp-4">{c.text}</span>
                  </li>
                ))}
          </ul>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          disabled={readOnly}
          onClick={onRemove}
          aria-label={t('removeSection', { heading: row.heading || number })}
          className="h-8 rounded-lg p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 disabled:hidden"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function SortableSection(props: Omit<CardProps, 'handle' | 'lifted'>) {
  const t = useTranslations('admin.studio.outline');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.row.key,
    disabled: props.disabled,
  });
  return (
    // Translate only: a scale would stretch the card to its neighbour's size.
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative"
    >
      {isDragging && (
        // The slot the section will drop into; the card itself follows the pointer.
        <div
          className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-primaryColor/40 bg-blue-50/70"
          aria-hidden
        />
      )}
      <SectionCard
        {...props}
        handle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={props.disabled}
            aria-label={t('drag', { n: props.number })}
            className="mt-0.5 h-7 cursor-grab touch-none rounded-md px-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40 active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent"
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        }
      />
    </li>
  );
}

export default function OutlineStep() {
  const t = useTranslations('admin.studio');
  const { piece, busy, locked, refresh, notify, go } = useWorkspace();
  const [rows, setRows] = useState<Row[]>(() => toRows(piece.outline));
  const [dragging, setDragging] = useState<{
    key: UniqueIdentifier;
    over: number;
  } | null>(null);
  const { run, pending } = useStudioAction(refresh, notify);
  const disabled = busy || locked || pending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const chunks = useChunks(rows.flatMap((r) => r.chunkIds));

  const position = (id: UniqueIdentifier) =>
    rows.findIndex((r) => r.key === id) + 1;
  const headingOf = (id: UniqueIdentifier) =>
    rows.find((r) => r.key === id)?.heading || position(id);
  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) =>
        t('outline.dnd.start', {
          heading: headingOf(active.id),
          n: position(active.id),
        }),
      onDragOver: ({ over }) =>
        over ? t('outline.dnd.over', { n: position(over.id) }) : undefined,
      onDragEnd: ({ over }) =>
        over ? t('outline.dnd.end', { n: position(over.id) }) : undefined,
      onDragCancel: ({ active }) =>
        t('outline.dnd.cancel', { n: position(active.id) }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, t]
  );

  if (piece.outline.length === 0 && busy) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-3"
        role="status"
        aria-label={t('run.outline')}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-3 w-4/5" />
          </div>
        ))}
        <CommandBar />
      </div>
    );
  }

  const edited =
    JSON.stringify(toInput(rows)) !==
    JSON.stringify(toInput(toRows(piece.outline)));
  const missingHeading = rows.some((r) => !r.heading.trim());
  const written = piece.sections.length > 0;
  const toRewrite = rows.filter(
    (r) => r.stale || !r.id || !piece.sections.some((s) => s.outlineId === r.id)
  ).length;
  const complete =
    written && toRewrite === 0 && !edited && piece.excerpt !== null;

  const gaps = piece.gaps
    .map((g) => gapText(t, g))
    .filter((g): g is string => Boolean(g));
  // Live from the rows, so removing or adding a section updates it at once.
  const short = lengthShortfall(rows, piece.brief.targetLength);
  const total = rows.reduce((n, r) => n + r.estChars, 0);
  const sourceCount = chunks
    ? new Set(
        rows
          .flatMap((r) => r.chunkIds.map((id) => chunks.get(id)?.sourceTitle))
          .filter(Boolean)
      ).size
    : null;
  const lifted = dragging
    ? rows.find((r) => r.key === dragging.key)
    : undefined;
  // While dragging, every card is numbered for the order it will have after
  // the drop, so the list and the lifted card never show the same number.
  const order = dragging
    ? arrayMove(
        rows.map((r) => r.key),
        rows.findIndex((r) => r.key === dragging.key),
        dragging.over - 1
      )
    : null;
  const numberOf = (key: string, index: number) =>
    order ? order.indexOf(key) + 1 : index + 1;

  function update(index: number, patch: Partial<Row>) {
    setRows((r) =>
      r.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  function onDragStart({ active }: DragStartEvent) {
    setDragging({ key: active.id, over: position(active.id) });
  }
  function onDragOver({ over }: DragOverEvent) {
    if (over) setDragging((d) => d && { ...d, over: position(over.id) });
  }
  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over || active.id === over.id) return;
    setRows((r) =>
      arrayMove(
        r,
        r.findIndex((x) => x.key === active.id),
        r.findIndex((x) => x.key === over.id)
      )
    );
  }

  const saveOutline = () => saveOutlineAction(piece.id, toInput(rows));
  const save = () => run(saveOutline);
  const write = () =>
    run(async () => {
      if (edited) {
        const saved = await saveOutline();
        if (!saved.ok) return saved;
      }
      return startRunAction(piece.id, 'write');
    });
  // Accept the length the material supports; the outline edits go in first
  // so the refresh this causes does not drop them.
  const acceptLength = (length: number) =>
    run(async () => {
      if (edited) {
        const saved = await saveOutline();
        if (!saved.ok) return saved;
      }
      return updatePieceSetupAction(piece.id, {
        brief: { ...piece.brief, targetLength: length },
      });
    });
  const supportedRounded = short
    ? Math.max(100, Math.round(short.supported / 100) * 100)
    : 0;

  // Shown in the command bar, which stays in view while the list scrolls.
  const summary =
    t('outline.summary', { sections: rows.length, chars: total }) +
    (sourceCount
      ? ` ${t('outline.summarySources', { count: sourceCount })}`
      : '');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {short && (
        <Banner
          tone="warning"
          title={t('outline.shortTitle')}
          action={
            !locked && (
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => go('setup')}
                >
                  {t('setup.addMaterial')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={disabled}
                  onClick={() => void acceptLength(supportedRounded)}
                >
                  {t('outline.useLength', { count: supportedRounded })}
                </Button>
              </div>
            )
          }
        >
          {t('outline.shortBody', {
            supported: short.supported,
            target: short.target,
          })}
        </Banner>
      )}

      {gaps.length > 0 && (
        <Banner tone="info" title={t('outline.gaps')}>
          <ul className="list-disc space-y-0.5 pl-4">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">{t('outline.gapsHint')}</p>
        </Banner>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: t('outline.dnd.instructions'),
          },
        }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <SortableContext
          items={rows.map((r) => r.key)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <SortableSection
                key={row.key}
                row={row}
                number={numberOf(row.key, index)}
                chunks={chunks}
                disabled={disabled}
                rewrites={
                  written &&
                  row.stale &&
                  piece.sections.some((s) => s.outlineId === row.id)
                }
                onChange={(patch) => update(index, patch)}
                onRemove={() => setRows((r) => r.filter((_, i) => i !== index))}
              />
            ))}
          </ol>
        </SortableContext>
        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {lifted && dragging ? (
            // Numbered for where it will land, so the new order reads while moving.
            <SectionCard
              row={lifted}
              number={dragging.over}
              chunks={chunks}
              disabled
              lifted
              handle={
                <span className="mt-0.5 flex h-7 cursor-grabbing items-center px-0.5 text-primaryColor">
                  <GripVertical className="h-4 w-4" aria-hidden />
                </span>
              }
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {!locked && (
        <Button
          variant="ghost"
          disabled={disabled}
          icon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                key: `new-${nextKey++}`,
                heading: '',
                intent: '',
                chunkIds: [],
                estChars: 400,
                kind: 'boilerplate',
                stale: false,
              },
            ])
          }
        >
          {t('outline.add')}
        </Button>
      )}
      {!locked && (
        <CommandBar
          hint={
            missingHeading
              ? t('outline.needHeadings')
              : edited
                ? t('bar.unsaved')
                : complete
                  ? t('outline.upToDate')
                  : written
                    ? t('outline.resumeHint', { count: toRewrite })
                    : summary
          }
        >
          {edited && (
            <BarButton
              disabled={disabled || missingHeading}
              onClick={() => void save()}
            >
              {t('outline.save')}
            </BarButton>
          )}
          {complete ? (
            <BarPrimary onClick={() => go('draft')}>
              {t('outline.toDraft')}
            </BarPrimary>
          ) : (
            <BarPrimary
              busy={pending}
              disabled={disabled || rows.length === 0 || missingHeading}
              onClick={() => void write()}
            >
              {written ? t('outline.continue') : t('outline.write')}
            </BarPrimary>
          )}
        </CommandBar>
      )}
    </div>
  );
}

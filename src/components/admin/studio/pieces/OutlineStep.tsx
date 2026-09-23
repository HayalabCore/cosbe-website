'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  getChunksAction,
  saveOutlineAction,
  startRunAction,
} from '@/actions/studio-pieces';
import type { OutlineSection } from '@/generator/pieces/piece-types';
import { Badge, Banner, Button, Skeleton } from '../ui';
import CommandBar, { BarButton, BarPrimary } from './CommandBar';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

type Row = Omit<OutlineSection, 'id' | 'stale'> & {
  key: string;
  id?: string;
  stale: boolean;
};
type Chunk = { id: string; sourceTitle: string; text: string };

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

/** The passages a section will be written from, loaded when asked for. */
function Passages({ ids }: { ids: string[] }) {
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  useEffect(() => {
    let live = true;
    void getChunksAction(ids).then(
      (r) => live && setChunks(r.ok ? r.data : [])
    );
    return () => {
      live = false;
    };
  }, [ids]);
  if (chunks === null) {
    return (
      <div className="space-y-2 pt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }
  return (
    <ul className="space-y-2 pt-3">
      {chunks.map((c) => (
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
  );
}

function SectionRow({
  row,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('admin.studio.outline');
  const [showPassages, setShowPassages] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key, disabled });
  const empty = !row.heading.trim();
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group rounded-xl border bg-white transition-shadow ${isDragging ? 'relative z-10 border-primaryColor shadow-lg' : 'border-slate-200'}`}
    >
      <div className="flex gap-3 px-3 py-4 sm:px-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={t('drag', { n: index + 1 })}
          className="mt-0.5 h-7 cursor-grab touch-none rounded-md px-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <span className="mt-1 w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            value={row.heading}
            disabled={disabled}
            aria-label={t('heading')}
            placeholder={t('headingPlaceholder')}
            onChange={(e) => onChange({ heading: e.target.value })}
            className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 ${empty ? 'border-amber-300' : ''}`}
          />
          <textarea
            value={row.intent}
            disabled={disabled}
            rows={1}
            aria-label={t('intent')}
            placeholder={t('intentPlaceholder')}
            onChange={(e) => onChange({ intent: e.target.value })}
            className="block w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed [field-sizing:content] text-slate-600 placeholder:text-slate-400 hover:border-slate-200 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
          />
          <div className="flex flex-wrap items-center gap-2 px-2 pt-1">
            {row.kind === 'boilerplate' || row.chunkIds.length === 0 ? (
              <Badge title={t('boilerplateHint')}>{t('boilerplate')}</Badge>
            ) : (
              <button
                type="button"
                aria-expanded={showPassages}
                onClick={() => setShowPassages((s) => !s)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {t('sources', { count: row.chunkIds.length })}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showPassages ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
            )}
            {row.stale && <Badge tone="amber">{t('stale')}</Badge>}
          </div>
          {showPassages && <Passages ids={row.chunkIds} />}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={t('removeSection', { heading: row.heading || index + 1 })}
          className="h-8 rounded-lg p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 disabled:hidden"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export default function OutlineStep() {
  const t = useTranslations('admin.studio');
  const { piece, busy, locked, refresh, notify, go } = useWorkspace();
  const [rows, setRows] = useState<Row[]>(() => toRows(piece.outline));
  const { run, pending } = useStudioAction(refresh, notify);
  const disabled = busy || locked || pending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  function update(index: number, patch: Partial<Row>) {
    setRows((r) =>
      r.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setRows((r) =>
      arrayMove(
        r,
        r.findIndex((x) => x.key === active.id),
        r.findIndex((x) => x.key === over.id)
      )
    );
  }

  const save = () => run(() => saveOutlineAction(piece.id, toInput(rows)));
  const write = () =>
    run(async () => {
      if (edited) {
        const saved = await saveOutlineAction(piece.id, toInput(rows));
        if (!saved.ok) return saved;
      }
      return startRunAction(piece.id, 'write');
    });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {piece.gaps.length > 0 && (
        <Banner tone="warning" title={t('outline.gaps')}>
          <ul className="list-disc space-y-0.5 pl-4">
            {piece.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">{t('outline.gapsHint')}</p>
        </Banner>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={rows.map((r) => r.key)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-2">
            {rows.map((row, index) => (
              <SectionRow
                key={row.key}
                row={row}
                index={index}
                disabled={disabled}
                onChange={(patch) => update(index, patch)}
                onRemove={() => setRows((r) => r.filter((_, i) => i !== index))}
              />
            ))}
          </ol>
        </SortableContext>
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
                    : t('outline.writeHint', { count: rows.length })
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

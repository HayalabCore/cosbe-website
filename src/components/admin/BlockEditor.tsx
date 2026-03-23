'use client';

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentBlock } from '@/types';
import { createEmptyBlock } from '@/lib/article-utils';
import HeadingBlockEditor from './blocks/HeadingBlockEditor';
import ParagraphBlockEditor from './blocks/ParagraphBlockEditor';
import ListBlockEditor from './blocks/ListBlockEditor';
import QuoteBlockEditor from './blocks/QuoteBlockEditor';
import CalloutBlockEditor from './blocks/CalloutBlockEditor';
import ImageBlockEditor from './blocks/ImageBlockEditor';
import CodeBlockEditor from './blocks/CodeBlockEditor';
import EmbedBlockEditor from './blocks/EmbedBlockEditor';
import DividerBlockEditor from './blocks/DividerBlockEditor';

type Props = {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  supabase: SupabaseClient;
  draftId: string;
};

type BlockMeta = {
  label: string;
  icon: React.ReactNode;
  description: string;
};

const BLOCK_ICONS: Record<ContentBlock['type'], React.ReactNode> = {
  heading: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h8" />
    </svg>
  ),
  paragraph: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 10h16M4 14h12"
      />
    </svg>
  ),
  list: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
      />
    </svg>
  ),
  quote: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  ),
  callout: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  image: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  code: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  ),
  divider: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  ),
  embed: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  ),
};

function useBlockMeta(): Record<ContentBlock['type'], BlockMeta> {
  const t = useTranslations('admin.blocks.types');
  return useMemo(
    () =>
      ({
        heading: {
          label: t('heading.label'),
          description: t('heading.description'),
          icon: BLOCK_ICONS.heading,
        },
        paragraph: {
          label: t('paragraph.label'),
          description: t('paragraph.description'),
          icon: BLOCK_ICONS.paragraph,
        },
        list: {
          label: t('list.label'),
          description: t('list.description'),
          icon: BLOCK_ICONS.list,
        },
        quote: {
          label: t('quote.label'),
          description: t('quote.description'),
          icon: BLOCK_ICONS.quote,
        },
        callout: {
          label: t('callout.label'),
          description: t('callout.description'),
          icon: BLOCK_ICONS.callout,
        },
        image: {
          label: t('image.label'),
          description: t('image.description'),
          icon: BLOCK_ICONS.image,
        },
        code: {
          label: t('code.label'),
          description: t('code.description'),
          icon: BLOCK_ICONS.code,
        },
        divider: {
          label: t('divider.label'),
          description: t('divider.description'),
          icon: BLOCK_ICONS.divider,
        },
        embed: {
          label: t('embed.label'),
          description: t('embed.description'),
          icon: BLOCK_ICONS.embed,
        },
      }) as Record<ContentBlock['type'], BlockMeta>,
    [t]
  );
}

const BLOCK_TYPES = Object.keys(BLOCK_ICONS) as ContentBlock['type'][];

function BlockTypeIcon({
  type,
  meta,
}: {
  type: ContentBlock['type'];
  meta: Record<ContentBlock['type'], BlockMeta>;
}) {
  const m = meta[type];
  return (
    <span
      title={m.label}
      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function DragHandle({
  attributes,
  listeners,
  label,
}: {
  attributes: DraggableAttributes;
  listeners: Record<string, unknown> | undefined;
  label: string;
}) {
  return (
    <button
      type="button"
      className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      title={label}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  );
}

const MENU_WIDTH = 288;
const GAP = 8;
const VIEW_PAD = 8;

function InsertMenu({
  anchorRef,
  onInsert,
  onClose,
  blockMeta,
  insertBlockTitle,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onInsert: (type: ContentBlock['type']) => void;
  onClose: () => void;
  blockMeta: Record<ContentBlock['type'], BlockMeta>;
  insertBlockTitle: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const place = () => {
      const a = anchor.getBoundingClientRect();
      const m = menu.getBoundingClientRect();
      const menuH = m.height > 0 ? m.height : 300;
      const menuW = Math.min(MENU_WIDTH, m.width > 0 ? m.width : MENU_WIDTH);

      let left = a.left;
      if (left + menuW > window.innerWidth - VIEW_PAD) {
        left = window.innerWidth - menuW - VIEW_PAD;
      }
      if (left < VIEW_PAD) left = VIEW_PAD;

      let top = a.bottom + GAP;
      const spaceBelow = window.innerHeight - a.bottom - GAP - VIEW_PAD;
      const spaceAbove = a.top - GAP - VIEW_PAD;

      if (top + menuH > window.innerHeight - VIEW_PAD) {
        const aboveTop = a.top - menuH - GAP;
        if (
          aboveTop >= VIEW_PAD &&
          (spaceAbove >= spaceBelow || spaceBelow < menuH)
        ) {
          top = aboveTop;
        } else {
          top = Math.max(VIEW_PAD, window.innerHeight - VIEW_PAD - menuH);
        }
      }

      setPos({ top, left });
    };

    place();
    const t = window.requestAnimationFrame(place);

    const ro = new ResizeObserver(place);
    ro.observe(menu);

    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    return () => {
      window.cancelAnimationFrame(t);
      ro.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorRef]);

  const content = (
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden />
      <div
        ref={menuRef}
        className="fixed z-[201] w-72 max-h-[min(70vh,calc(100vh-1rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
        style={
          pos
            ? { top: pos.top, left: pos.left }
            : { top: -9999, left: -9999, visibility: 'hidden' as const }
        }
      >
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          {insertBlockTitle}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {BLOCK_TYPES.map((bt) => {
            const m = blockMeta[bt];
            return (
              <button
                key={bt}
                type="button"
                onClick={() => onInsert(bt)}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 transition-colors group"
              >
                <span className="mt-0.5 text-slate-400 group-hover:text-primaryColor transition-colors flex-shrink-0">
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                    {m.label}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {m.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function SortableBlockRow({
  block,
  index,
  blocksLength,
  supabase,
  draftId,
  openMenu,
  setOpenMenu,
  updateAt,
  removeAt,
  move,
  insertAt,
  blockMeta,
  dragLabel,
  moveUpLabel,
  moveDownLabel,
  removeLabel,
  insertBelowLabel,
  insertBlockTitle,
}: {
  block: ContentBlock;
  index: number;
  blocksLength: number;
  supabase: SupabaseClient;
  draftId: string;
  openMenu: number | null;
  setOpenMenu: (v: number | null) => void;
  updateAt: (index: number, block: ContentBlock) => void;
  removeAt: (index: number) => void;
  move: (index: number, dir: -1 | 1) => void;
  insertAt: (index: number, type: ContentBlock['type']) => void;
  blockMeta: Record<ContentBlock['type'], BlockMeta>;
  dragLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  removeLabel: string;
  insertBelowLabel: string;
  insertBlockTitle: string;
}) {
  const insertBtnRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 30 : undefined,
    position: 'relative' as const,
  };

  const i = index;

  return (
    <div ref={setNodeRef} style={style} className="group/block relative">
      <div
        className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
          isDragging
            ? 'border-primaryColor ring-2 ring-primaryColor/25'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60">
          <BlockTypeIcon type={block.type} meta={blockMeta} />
          <div className="flex items-center gap-0.5">
            <DragHandle
              attributes={attributes}
              listeners={listeners}
              label={dragLabel}
            />
            <button
              type="button"
              title={moveUpLabel}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              title={moveDownLabel}
              disabled={i === blocksLength - 1}
              onClick={() => move(i, 1)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              title={removeLabel}
              onClick={() => removeAt(i)}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-3">
          {block.type === 'heading' && (
            <HeadingBlockEditor
              block={block}
              onChange={(b) => updateAt(i, b)}
            />
          )}
          {block.type === 'paragraph' && (
            <ParagraphBlockEditor
              block={block}
              onChange={(b) => updateAt(i, b)}
            />
          )}
          {block.type === 'list' && (
            <ListBlockEditor block={block} onChange={(b) => updateAt(i, b)} />
          )}
          {block.type === 'quote' && (
            <QuoteBlockEditor block={block} onChange={(b) => updateAt(i, b)} />
          )}
          {block.type === 'callout' && (
            <CalloutBlockEditor
              block={block}
              onChange={(b) => updateAt(i, b)}
            />
          )}
          {block.type === 'image' && (
            <ImageBlockEditor
              block={block}
              onChange={(b) => updateAt(i, b)}
              supabase={supabase}
              draftId={draftId}
            />
          )}
          {block.type === 'code' && (
            <CodeBlockEditor block={block} onChange={(b) => updateAt(i, b)} />
          )}
          {block.type === 'divider' && <DividerBlockEditor />}
          {block.type === 'embed' && (
            <EmbedBlockEditor block={block} onChange={(b) => updateAt(i, b)} />
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center py-1.5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200 opacity-0 group-hover/block:opacity-100 transition-opacity" />
        <div className="relative">
          <button
            ref={insertBtnRef}
            type="button"
            title={insertBelowLabel}
            onClick={() => setOpenMenu(openMenu === i ? null : i)}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 shadow-sm hover:border-primaryColor hover:text-primaryColor opacity-0 group-hover/block:opacity-100 transition-all hover:shadow"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {insertBelowLabel}
          </button>
          {openMenu === i && (
            <InsertMenu
              anchorRef={insertBtnRef}
              onInsert={(ty) => insertAt(i + 1, ty)}
              onClose={() => setOpenMenu(null)}
              blockMeta={blockMeta}
              insertBlockTitle={insertBlockTitle}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function BlockEditor({
  blocks,
  onChange,
  supabase,
  draftId,
}: Props) {
  const t = useTranslations('admin.blocks');
  const blockMeta = useBlockMeta();
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const emptyAddBtnRef = useRef<HTMLButtonElement>(null);
  const endAddBtnRef = useRef<HTMLButtonElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  }

  function updateAt(index: number, block: ContentBlock) {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  }

  function insertAt(index: number, type: ContentBlock['type']) {
    const next = [...blocks];
    next.splice(index, 0, createEmptyBlock(type));
    onChange(next);
    setOpenMenu(null);
  }

  const sortableIds = blocks.map((b) => b.id);

  return (
    <div className="space-y-1">
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
          <svg
            className="w-8 h-8 text-slate-300 mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-sm font-medium text-slate-500 mb-1">
            {t('noBlocksTitle')}
          </p>
          <p className="text-xs text-slate-400 mb-4">{t('noBlocksHint')}</p>
          <div className="relative">
            <button
              ref={emptyAddBtnRef}
              type="button"
              onClick={() => setOpenMenu(-1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primaryColor px-3 py-2 text-sm font-semibold text-white hover:bg-primaryHover transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('addBlock')}
            </button>
            {openMenu === -1 && (
              <InsertMenu
                anchorRef={emptyAddBtnRef}
                onInsert={(ty) => insertAt(0, ty)}
                onClose={() => setOpenMenu(null)}
                blockMeta={blockMeta}
                insertBlockTitle={t('insertBlock')}
              />
            )}
          </div>
        </div>
      )}

      {blocks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block, i) => (
              <SortableBlockRow
                key={block.id}
                block={block}
                index={i}
                blocksLength={blocks.length}
                supabase={supabase}
                draftId={draftId}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                updateAt={updateAt}
                removeAt={removeAt}
                move={move}
                insertAt={insertAt}
                blockMeta={blockMeta}
                dragLabel={t('dragReorder')}
                moveUpLabel={t('moveUp')}
                moveDownLabel={t('moveDown')}
                removeLabel={t('removeBlock')}
                insertBelowLabel={t('insertBelow')}
                insertBlockTitle={t('insertBlock')}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {blocks.length > 0 && (
        <div className="relative pt-1">
          <button
            ref={endAddBtnRef}
            type="button"
            onClick={() =>
              setOpenMenu(openMenu === blocks.length ? null : blocks.length)
            }
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-400 hover:border-primaryColor hover:text-primaryColor hover:bg-primaryColor/5 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('addBlock')}
          </button>
          {openMenu === blocks.length && (
            <InsertMenu
              anchorRef={endAddBtnRef}
              onInsert={(ty) => insertAt(blocks.length, ty)}
              onClose={() => setOpenMenu(null)}
              blockMeta={blockMeta}
              insertBlockTitle={t('insertBlock')}
            />
          )}
        </div>
      )}
    </div>
  );
}

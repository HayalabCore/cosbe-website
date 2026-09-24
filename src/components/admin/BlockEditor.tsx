'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Editor } from '@tiptap/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type Modifier,
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
  ChevronUp,
  Code2,
  GripVertical,
  Heading2,
  ImageIcon,
  Info,
  Link2,
  List,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import type { ContentBlock } from '@/types';
import { createEmptyBlock } from '@/lib/article-utils';
import { hasTranslatablePrimaryContent } from '@/lib/block-translation-utils';
import {
  BlockToolbarSlot,
  FormatBarContext,
  type FormatBarApi,
} from './block-canvas-context';
import HeadingBlockEditor from './blocks/HeadingBlockEditor';
import ParagraphBlockEditor, {
  RichToolbar,
} from './blocks/ParagraphBlockEditor';
import ListBlockEditor from './blocks/ListBlockEditor';
import QuoteBlockEditor from './blocks/QuoteBlockEditor';
import CalloutBlockEditor from './blocks/CalloutBlockEditor';
import ImageBlockEditor from './blocks/ImageBlockEditor';
import CodeBlockEditor from './blocks/CodeBlockEditor';
import EmbedBlockEditor from './blocks/EmbedBlockEditor';
import DividerBlockEditor from './blocks/DividerBlockEditor';
import TableBlockEditor from './blocks/TableBlockEditor';

/** Blocks only move up and down. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type BlockType = ContentBlock['type'];

type Props = {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  /** Fired when a TipTap paragraph editor loses focus (e.g. user leaves the field). */
  onParagraphBlur?: () => void;
  localeViewKey?: number;
  bulkTranslating?: boolean;
  localeViewTab?: 'original' | 'english';
};

type BlockMeta = { label: string; description: string; icon: ReactNode };

const ICON = 'h-4 w-4';
const BLOCK_ICONS: Record<BlockType, ReactNode> = {
  heading: <Heading2 className={ICON} aria-hidden />,
  paragraph: <Pilcrow className={ICON} aria-hidden />,
  list: <List className={ICON} aria-hidden />,
  quote: <Quote className={ICON} aria-hidden />,
  callout: <Info className={ICON} aria-hidden />,
  image: <ImageIcon className={ICON} aria-hidden />,
  code: <Code2 className={ICON} aria-hidden />,
  divider: <Minus className={ICON} aria-hidden />,
  embed: <Link2 className={ICON} aria-hidden />,
  table: <Table2 className={ICON} aria-hidden />,
};

const BLOCK_TYPES = Object.keys(BLOCK_ICONS) as BlockType[];

function useBlockMeta(): Record<BlockType, BlockMeta> {
  const t = useTranslations('admin.blocks.types');
  return useMemo(
    () =>
      Object.fromEntries(
        BLOCK_TYPES.map((type) => [
          type,
          {
            label: t(`${type}.label`),
            description: t(`${type}.description`),
            icon: BLOCK_ICONS[type],
          },
        ])
      ) as Record<BlockType, BlockMeta>,
    [t]
  );
}

/* ------------------------------------------------------------------------ */
/* Insert menu                                                               */
/* ------------------------------------------------------------------------ */

const MENU_WIDTH = 320;
const GAP = 8;
const VIEW_PAD = 8;

/** Keeps a portalled menu next to its anchor and inside the viewport. */
function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>
) {
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
      if (left + menuW > window.innerWidth - VIEW_PAD)
        left = window.innerWidth - menuW - VIEW_PAD;
      if (left < VIEW_PAD) left = VIEW_PAD;

      let top = a.bottom + GAP;
      const spaceBelow = window.innerHeight - a.bottom - GAP - VIEW_PAD;
      const spaceAbove = a.top - GAP - VIEW_PAD;
      if (top + menuH > window.innerHeight - VIEW_PAD) {
        const aboveTop = a.top - menuH - GAP;
        if (
          aboveTop >= VIEW_PAD &&
          (spaceAbove >= spaceBelow || spaceBelow < menuH)
        )
          top = aboveTop;
        else top = Math.max(VIEW_PAD, window.innerHeight - VIEW_PAD - menuH);
      }
      setPos({ top, left });
    };

    place();
    const frame = window.requestAnimationFrame(place);
    const ro = new ResizeObserver(place);
    ro.observe(menu);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorRef, menuRef]);

  return pos;
}

/**
 * How well a block type matches the search: 0 name starts with it, 1 name
 * contains it, 2 only the description does, null no match. The English type
 * name always counts too, so "h2" or "table" works in either admin language.
 */
function matchRank(type: BlockType, meta: BlockMeta, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const names = [type, meta.label.toLowerCase()];
  if (names.some((n) => n.startsWith(q))) return 0;
  if (names.some((n) => n.includes(q))) return 1;
  if (meta.description.toLowerCase().includes(q)) return 2;
  return null;
}

/**
 * The block picker: type to filter, arrows to move, Enter to insert. It is
 * portalled so a block's overflow never clips it.
 */
function InsertMenu({
  anchorRef,
  onInsert,
  onClose,
  blockMeta,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onInsert: (type: BlockType) => void;
  onClose: () => void;
  blockMeta: Record<BlockType, BlockMeta>;
}) {
  const t = useTranslations('admin.blocks');
  const menuRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchorRef, menuRef);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listId = 'block-insert-options';
  const searchRef = useRef<HTMLInputElement>(null);
  const placed = pos !== null;
  // The menu is invisible until placed, and hidden inputs cannot take focus.
  useEffect(() => {
    if (placed) searchRef.current?.focus();
  }, [placed]);

  const options = BLOCK_TYPES.map((type) => ({
    type,
    rank: matchRank(type, blockMeta[type], query),
  }))
    .filter((o): o is { type: BlockType; rank: number } => o.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((o) => o.type);
  const active = Math.min(cursor, Math.max(0, options.length - 1));

  function close() {
    onClose();
    anchorRef.current?.focus();
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={close} aria-hidden />
      <div
        ref={menuRef}
        role="dialog"
        aria-label={t('insertBlock')}
        className="fixed z-[201] flex max-h-[min(70vh,calc(100vh-1rem))] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        style={
          pos
            ? { top: pos.top, left: pos.left }
            : { top: -9999, left: -9999, visibility: 'hidden' }
        }
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={
              options[active] ? `block-option-${options[active]}` : undefined
            }
            aria-label={t('searchBlocks')}
            placeholder={t('searchBlocks')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((active + 1) % Math.max(1, options.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor(
                  (active - 1 + options.length) % Math.max(1, options.length)
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (options[active]) onInsert(options[active]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
              }
            }}
            className="h-11 w-full min-w-0 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label={t('insertBlock')}
          className="overflow-y-auto p-1.5"
        >
          {options.map((type, i) => {
            const m = blockMeta[type];
            return (
              <li
                key={type}
                id={`block-option-${type}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsert(type)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${
                  i === active ? 'bg-slate-100' : ''
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    i === active
                      ? 'border-primaryColor/30 bg-white text-primaryColor'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {m.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">
                    {m.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {m.description}
                  </span>
                </span>
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-slate-400">
              {t('noMatch')}
            </li>
          )}
        </ul>
      </div>
    </>,
    document.body
  );
}

/** A button that opens the insert menu for one position in the document. */
function InsertButton({
  menuKey,
  at,
  open,
  setOpen,
  onInsert,
  blockMeta,
  children,
  className,
  label,
}: {
  /** Which button owns the open menu; several can insert at one position. */
  menuKey: string;
  at: number;
  open: string | null;
  setOpen: (key: string | null) => void;
  onInsert: (at: number, type: BlockType) => void;
  blockMeta: Record<BlockType, BlockMeta>;
  children: ReactNode;
  className: string;
  label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open === menuKey}
        onClick={() => setOpen(open === menuKey ? null : menuKey)}
        className={className}
      >
        {children}
      </button>
      {open === menuKey && (
        <InsertMenu
          anchorRef={ref}
          onInsert={(type) => onInsert(at, type)}
          onClose={() => setOpen(null)}
          blockMeta={blockMeta}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Formatting bar                                                            */
/* ------------------------------------------------------------------------ */

/**
 * One formatting bar for the whole document. It follows whichever paragraph
 * has focus and greys out when none does, so the page carries no per-block
 * toolbars.
 */
function FormatBar({
  editor,
  enabled,
  barRef,
  onLeave,
  label,
  hidden,
  children,
}: {
  label: string;
  hidden: boolean;
  editor: Editor | null;
  enabled: boolean;
  barRef: RefObject<HTMLDivElement | null>;
  onLeave: () => void;
  children: ReactNode;
}) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', rerender);
    return () => {
      editor.off('transaction', rerender);
    };
  }, [editor]);

  const live = enabled && editor && !editor.isDestroyed ? editor : null;
  return (
    // Floats at the bottom of the writing area, centred between the admin
    // sidebar (lg) and the post settings panel (xl), like the posts bulk bar.
    <div
      hidden={hidden}
      className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 lg:left-56 xl:right-72"
    >
      <div
        ref={barRef}
        role="toolbar"
        aria-label={label}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (e.currentTarget.contains(next)) return;
          if (editor && !editor.isDestroyed && editor.view.dom.contains(next))
            return;
          onLeave();
        }}
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl bg-slate-900 p-1.5 pl-2.5 shadow-2xl ring-1 ring-black/10"
      >
        <RichToolbar
          editor={live}
          tone="dark"
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]"
        />
        <span className="h-5 w-px shrink-0 bg-white/15" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Block row                                                                 */
/* ------------------------------------------------------------------------ */

const ICON_BTN =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

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
      className={`${ICON_BTN} touch-none cursor-grab active:cursor-grabbing`}
      title={label}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

/** Controls that stay hidden until the block is hovered or being edited. */
const REVEAL =
  'opacity-0 transition-opacity duration-150 group-hover/block:opacity-100 group-focus-within/block:opacity-100';

function SortableBlockRow({
  block,
  index,
  count,
  menu,
  setMenu,
  updateAt,
  removeAt,
  move,
  insertAt,
  onFocusBlock,
  blockMeta,
  onParagraphBlur,
  localeViewKey,
  bulkTranslating,
  localeViewTab = 'original',
}: {
  block: ContentBlock;
  index: number;
  count: number;
  menu: string | null;
  setMenu: (key: string | null) => void;
  updateAt: (index: number, block: ContentBlock) => void;
  removeAt: (index: number) => void;
  move: (index: number, dir: -1 | 1) => void;
  insertAt: (at: number, type: BlockType) => void;
  onFocusBlock: (id: string) => void;
  blockMeta: Record<BlockType, BlockMeta>;
  onParagraphBlur?: () => void;
  localeViewKey?: number;
  bulkTranslating?: boolean;
  localeViewTab?: 'original' | 'english';
}) {
  const t = useTranslations('admin.blocks');
  const [slot, setSlot] = useState<HTMLSpanElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    // Translate only: a scale would stretch the block to its neighbour's size.
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: 'relative' as const,
  };

  const i = index;
  const meta = blockMeta[block.type];
  const blockBulkTranslating =
    Boolean(bulkTranslating) && hasTranslatablePrimaryContent(block);
  const update = (b: ContentBlock) => updateAt(i, b);
  const common = {
    localeViewKey,
    localeViewTab,
    bulkTranslating: blockBulkTranslating,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      onFocus={() => onFocusBlock(block.id)}
      className="group/block relative flex items-start lg:-ml-12"
    >
      {/* Gutter: insert below and drag, outside the text column. */}
      <div
        className={`hidden w-12 shrink-0 items-center justify-end gap-0.5 pr-1 pt-2 lg:flex ${
          isDragging ? 'opacity-100' : REVEAL
        }`}
      >
        <InsertButton
          menuKey={`gutter-${block.id}`}
          at={i + 1}
          open={menu}
          setOpen={setMenu}
          onInsert={insertAt}
          blockMeta={blockMeta}
          label={t('insertBelow')}
          className={ICON_BTN}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </InsertButton>
        <DragHandle
          attributes={attributes}
          listeners={listeners}
          label={t('dragReorder')}
        />
      </div>

      <div
        tabIndex={-1}
        className={`relative min-w-0 flex-1 rounded-lg px-3 py-2 outline-none transition-[background-color,box-shadow] ${
          isDragging
            ? 'bg-white shadow-xl ring-1 ring-slate-200'
            : 'group-focus-within/block:bg-slate-50'
        }`}
      >
        {/* Floating toolbar for the block being edited: type, language,
            order, remove. Hover only reveals the gutter, so moving the
            pointer down the page never stacks toolbars. */}
        <div
          role="toolbar"
          aria-label={meta.label}
          className="pointer-events-none absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity duration-150 group-focus-within/block:pointer-events-auto group-focus-within/block:opacity-100"
        >
          <span className="flex items-center gap-1.5 px-1.5 text-[11px] font-medium text-slate-500">
            {meta.icon}
            {meta.label}
          </span>
          <span ref={setSlot} className="contents" />
          <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
          <InsertButton
            menuKey={`toolbar-${block.id}`}
            at={i + 1}
            open={menu}
            setOpen={setMenu}
            onInsert={insertAt}
            blockMeta={blockMeta}
            label={t('insertBelow')}
            className={`${ICON_BTN} lg:hidden`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </InsertButton>
          <button
            type="button"
            title={t('moveUp')}
            aria-label={t('moveUp')}
            disabled={i === 0}
            onClick={() => move(i, -1)}
            className={ICON_BTN}
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            title={t('moveDown')}
            aria-label={t('moveDown')}
            disabled={i === count - 1}
            onClick={() => move(i, 1)}
            className={ICON_BTN}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            title={t('removeBlock')}
            aria-label={t('removeBlock')}
            onClick={() => removeAt(i)}
            className={`${ICON_BTN} hover:!bg-red-50 hover:!text-red-600`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <BlockToolbarSlot.Provider value={slot}>
          {block.type === 'heading' && (
            <HeadingBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'paragraph' && (
            <ParagraphBlockEditor
              block={block}
              onChange={update}
              onBlur={onParagraphBlur}
              {...common}
            />
          )}
          {block.type === 'list' && (
            <ListBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'quote' && (
            <QuoteBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'callout' && (
            <CalloutBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'image' && (
            <ImageBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'code' && (
            <CodeBlockEditor block={block} onChange={update} />
          )}
          {block.type === 'divider' && <DividerBlockEditor />}
          {block.type === 'embed' && (
            <EmbedBlockEditor block={block} onChange={update} {...common} />
          )}
          {block.type === 'table' && (
            <TableBlockEditor block={block} onChange={update} {...common} />
          )}
        </BlockToolbarSlot.Provider>
      </div>
    </div>
  );
}

/** Puts the caret in a block's first field, once it has mounted. */
function focusBlock(id: string, attempts = 10) {
  const field = document
    .querySelector(`[data-block-id="${window.CSS.escape(id)}"]`)
    ?.querySelector<HTMLElement>(
      '[contenteditable="true"], input:not([type="file"]):not([type="color"]), textarea'
    );
  if (field) field.focus();
  else if (attempts > 0)
    window.requestAnimationFrame(() => focusBlock(id, attempts - 1));
}

/* ------------------------------------------------------------------------ */
/* Canvas                                                                    */
/* ------------------------------------------------------------------------ */

export default function BlockEditor({
  blocks,
  onChange,
  onParagraphBlur,
  localeViewKey,
  bulkTranslating,
  localeViewTab = 'original',
}: Props) {
  const t = useTranslations('admin.blocks');
  const blockMeta = useBlockMeta();
  const [menu, setMenu] = useState<string | null>(null);
  // By id, not index: the block can move after it had focus.
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // The shared formatting bar and the paragraph it currently serves.
  const barRef = useRef<HTMLDivElement>(null);
  const [formatEditor, setFormatEditor] = useState<Editor | null>(null);
  const [formatOn, setFormatOn] = useState(false);
  const formatApi = useMemo<FormatBarApi>(
    () => ({
      activate: (editor) => {
        setFormatEditor(editor);
        setFormatOn(true);
      },
    }),
    []
  );
  useEffect(() => {
    if (!formatEditor) return;
    const onBlur = ({ event }: { event: FocusEvent }) => {
      if (!barRef.current?.contains(event.relatedTarget as Node | null))
        setFormatOn(false);
    };
    const onDestroy = () => setFormatOn(false);
    formatEditor.on('blur', onBlur);
    formatEditor.on('destroy', onDestroy);
    return () => {
      formatEditor.off('blur', onBlur);
      formatEditor.off('destroy', onDestroy);
    };
  }, [formatEditor]);

  // The floating bar belongs to the article: hide it once the document has
  // scrolled away (below xl the post settings follow it on the same page).
  const canvasRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(blocks, from, to));
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

  const insertAt = useCallback(
    (at: number, type: BlockType) => {
      const block = createEmptyBlock(type);
      const next = [...blocks];
      next.splice(at, 0, block);
      onChange(next);
      setMenu(null);
      window.requestAnimationFrame(() => focusBlock(block.id));
    },
    [blocks, onChange]
  );

  // The bar's insert goes below the block being edited, or at the end.
  const focusedIndex = blocks.findIndex((b) => b.id === focusedId);
  const barInsertAt = focusedIndex === -1 ? blocks.length : focusedIndex + 1;

  return (
    <FormatBarContext.Provider value={formatApi}>
      <div ref={canvasRef}>
        <FormatBar
          hidden={!inView}
          editor={formatEditor}
          enabled={formatOn}
          barRef={barRef}
          onLeave={() => setFormatOn(false)}
          label={t('formatting')}
        >
          <InsertButton
            menuKey="bar"
            at={barInsertAt}
            open={menu}
            setOpen={setMenu}
            onInsert={insertAt}
            blockMeta={blockMeta}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primaryColor px-3 text-xs font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('insertBlock')}
          </InsertButton>
        </FormatBar>

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-14 text-center">
            <p className="mb-4 text-sm font-medium text-slate-500">
              {t('noBlocksTitle')}
            </p>
            <InsertButton
              menuKey="empty"
              at={0}
              open={menu}
              setOpen={setMenu}
              onInsert={insertAt}
              blockMeta={blockMeta}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primaryColor px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('addBlock')}
            </InsertButton>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[verticalOnly]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {blocks.map((block, i) => (
                  <SortableBlockRow
                    key={block.id}
                    block={block}
                    index={i}
                    count={blocks.length}
                    menu={menu}
                    setMenu={setMenu}
                    updateAt={updateAt}
                    removeAt={removeAt}
                    move={move}
                    insertAt={insertAt}
                    onFocusBlock={(id) => {
                      if (id !== focusedId) setFocusedId(id);
                    }}
                    blockMeta={blockMeta}
                    onParagraphBlur={onParagraphBlur}
                    localeViewKey={localeViewKey}
                    bulkTranslating={bulkTranslating}
                    localeViewTab={localeViewTab}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {blocks.length > 0 && (
          <InsertButton
            menuKey="end"
            at={blocks.length}
            open={menu}
            setOpen={setMenu}
            onInsert={insertAt}
            blockMeta={blockMeta}
            className="mb-16 mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t('addBlock')}
          </InsertButton>
        )}
      </div>
    </FormatBarContext.Provider>
  );
}

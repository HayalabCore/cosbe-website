'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { useTranslations } from 'next-intl';
import { useLocaleEditTab } from '@/hooks';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Baseline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  TextQuote,
  Link as LinkIcon,
  Link2Off,
  RemoveFormatting,
} from 'lucide-react';
import type { ParagraphBlock } from '@/types';
import {
  paragraphContentToHtml,
  stripHtmlForMetrics,
} from '@/lib/sanitize-article-html';
import { translateBlockEnAction } from '@/actions/block-translation';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';
import {
  createParagraphExtensions,
  toEditorHtmlForParagraph,
} from '@/components/admin/paragraph-editor-extensions';
import { useFormatBar } from '@/components/admin/block-canvas-context';

const TEXT_COLOR_KEYS = [
  { key: 'default', value: '' },
  { key: 'body', value: '#374151' },
  { key: 'primary', value: '#549FE3' },
  { key: 'heading', value: '#111827' },
  { key: 'muted', value: '#6B7280' },
  { key: 'success', value: '#15803d' },
  { key: 'warning', value: '#b45309' },
  { key: 'danger', value: '#b91c1c' },
] as const;

const HIGHLIGHT_KEYS = [
  { key: 'none', value: '' },
  { key: 'yellow', value: '#fef08a' },
  { key: 'green', value: '#bbf7d0' },
  { key: 'blue', value: '#bfdbfe' },
  { key: 'pink', value: '#fbcfe8' },
  { key: 'amber', value: '#fde68a' },
] as const;

const EDITOR_CHROME_CLASS = [
  'prose prose-sm max-w-none focus:outline-none min-h-[140px] px-3 py-2.5 text-slate-900',
  '[&_a]:text-primaryColor [&_a]:underline',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul>li]:my-0.5 [&_ul>li::marker]:text-slate-500',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol>li]:my-0.5 [&_ol>li::marker]:text-slate-500',
  '[&_li>p]:my-0',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-3',
  '[&_mark]:rounded-sm [&_mark]:px-0.5',
  // TipTap's Placeholder only sets data-placeholder; it needs this to show.
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-slate-300 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
].join(' ');

/** In the canvas: no box, and body text at the size the article is read in. */
const EDITOR_CANVAS_CLASS = EDITOR_CHROME_CLASS.replace(
  'prose prose-sm max-w-none focus:outline-none min-h-[140px] px-3 py-2.5',
  'prose max-w-none focus:outline-none min-h-[1.75rem] py-1 text-[15px] leading-7 prose-p:my-2 first:[&>*]:mt-0 last:[&>*]:mb-0'
);

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection: the command runs on the focused paragraph.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors shrink-0 ${
        active
          ? 'bg-primaryColor/15 text-primaryColor'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" aria-hidden />;
}

const selectCls =
  'h-7 max-w-[5.5rem] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:border-primaryColor cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-40';

type Chain = ReturnType<Editor['chain']>;

/**
 * Formatting controls for one TipTap editor. With no editor (nothing focused
 * in the canvas yet) every control is shown disabled, so the bar keeps its
 * shape.
 */
export function RichToolbar({
  editor,
  className = 'flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 rounded-t-lg px-2 py-1.5',
}: {
  editor: Editor | null;
  className?: string;
}) {
  const tt = useTranslations('admin.paragraph.toolbar');
  const tc = useTranslations('admin.paragraph.textColors');
  const th = useTranslations('admin.paragraph.highlights');
  const t = useTranslations('admin.paragraph');

  const off = !editor;
  const is = (name: string | Record<string, unknown>, attrs?: object) =>
    editor
      ? typeof name === 'string'
        ? editor.isActive(name, attrs)
        : editor.isActive(name)
      : false;
  const run = (command: (chain: Chain) => Chain) => {
    if (editor) command(editor.chain().focus()).run();
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(
      t('linkPromptTitle'),
      prev ?? t('linkPromptDefault')
    );
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === '') {
      run((c) => c.extendMarkRange('link').unsetLink());
      return;
    }
    run((c) => c.extendMarkRange('link').setLink({ href: trimmed }));
  };

  const currentColor =
    (editor?.getAttributes('textStyle').color as string | undefined) ?? '';
  const highlightColor =
    (editor?.getAttributes('highlight').color as string | undefined) ?? '';

  return (
    <div className={className}>
      <Btn
        title={tt('bold')}
        disabled={off}
        active={is('bold')}
        onClick={() => run((c) => c.toggleBold())}
      >
        <Bold size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('italic')}
        disabled={off}
        active={is('italic')}
        onClick={() => run((c) => c.toggleItalic())}
      >
        <Italic size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('underline')}
        disabled={off}
        active={is('underline')}
        onClick={() => run((c) => c.toggleUnderline())}
      >
        <UnderlineIcon size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('strike')}
        disabled={off}
        active={is('strike')}
        onClick={() => run((c) => c.toggleStrike())}
      >
        <Strikethrough size={14} strokeWidth={2.5} />
      </Btn>

      <Sep />

      <label
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors shrink-0 text-slate-500 ${
          off
            ? 'cursor-not-allowed opacity-30'
            : 'cursor-pointer hover:bg-slate-100 hover:text-slate-800'
        }`}
        title={tt('customTextColor')}
      >
        <div className="flex flex-col items-center gap-[2px]">
          <Baseline size={12} strokeWidth={2} />
          <span
            className="h-[3px] w-[14px] rounded-full"
            style={{ backgroundColor: currentColor || '#374151' }}
          />
        </div>
        <input
          type="color"
          className="sr-only"
          disabled={off}
          value={
            currentColor && /^#/.test(currentColor) ? currentColor : '#374151'
          }
          onInput={(e) =>
            run((c) => c.setColor((e.target as HTMLInputElement).value))
          }
        />
      </label>
      <select
        title={tt('textColorPreset')}
        aria-label={tt('textColorPreset')}
        className={selectCls}
        disabled={off}
        value={
          TEXT_COLOR_KEYS.some((c) => c.value === currentColor)
            ? currentColor
            : '__custom__'
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (v === '') run((c) => c.unsetColor());
          else run((c) => c.setColor(v));
        }}
      >
        <option value="__custom__">{t('colorPicker')}</option>
        {TEXT_COLOR_KEYS.map((c) => (
          <option key={c.key} value={c.value}>
            {tc(c.key)}
          </option>
        ))}
      </select>

      <Sep />

      <Btn
        title={tt('toggleHighlight')}
        disabled={off}
        active={is('highlight')}
        onClick={() =>
          run((c) =>
            is('highlight')
              ? c.unsetHighlight()
              : c.setHighlight({ color: '#fef08a' })
          )
        }
      >
        <Highlighter
          size={14}
          strokeWidth={2}
          style={{ color: highlightColor || undefined }}
        />
      </Btn>
      <select
        title={tt('highlightColor')}
        aria-label={tt('highlightColor')}
        className={selectCls}
        disabled={off}
        value={
          HIGHLIGHT_KEYS.some((h) => h.value === highlightColor)
            ? highlightColor
            : '__custom__'
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (v === '') run((c) => c.unsetHighlight());
          else run((c) => c.setHighlight({ color: v }));
        }}
      >
        <option value="__custom__">{t('highlightPicker')}</option>
        {HIGHLIGHT_KEYS.map((h) => (
          <option key={h.key} value={h.value}>
            {th(h.key)}
          </option>
        ))}
      </select>

      <Sep />

      <Btn
        title={tt('alignLeft')}
        disabled={off}
        active={is({ textAlign: 'left' })}
        onClick={() => run((c) => c.setTextAlign('left'))}
      >
        <AlignLeft size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('alignCenter')}
        disabled={off}
        active={is({ textAlign: 'center' })}
        onClick={() => run((c) => c.setTextAlign('center'))}
      >
        <AlignCenter size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('alignRight')}
        disabled={off}
        active={is({ textAlign: 'right' })}
        onClick={() => run((c) => c.setTextAlign('right'))}
      >
        <AlignRight size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('justify')}
        disabled={off}
        active={is({ textAlign: 'justify' })}
        onClick={() => run((c) => c.setTextAlign('justify'))}
      >
        <AlignJustify size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('bulletList')}
        disabled={off}
        active={is('bulletList')}
        onClick={() => run((c) => c.toggleBulletList())}
      >
        <List size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('numberedList')}
        disabled={off}
        active={is('orderedList')}
        onClick={() => run((c) => c.toggleOrderedList())}
      >
        <ListOrdered size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('blockquote')}
        disabled={off}
        active={is('blockquote')}
        onClick={() => run((c) => c.toggleBlockquote())}
      >
        <TextQuote size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('addLink')}
        disabled={off}
        active={is('link')}
        onClick={setLink}
      >
        <LinkIcon size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('removeLink')}
        disabled={off || !is('link')}
        onClick={() => run((c) => c.unsetLink())}
      >
        <Link2Off size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('clearFormatting')}
        disabled={off}
        onClick={() => run((c) => c.unsetAllMarks())}
      >
        <RemoveFormatting size={14} strokeWidth={2} />
      </Btn>
    </div>
  );
}

function RichParagraphPane({
  paneKey,
  extensions,
  html,
  onHtmlChange,
  onBlur,
}: {
  paneKey: string;
  extensions: ReturnType<typeof createParagraphExtensions>;
  html: string;
  onHtmlChange: (html: string) => void;
  onBlur?: () => void;
}) {
  const formatBar = useFormatBar();
  const onBlurRef = useRef(onBlur);
  const formatBarRef = useRef(formatBar);
  useLayoutEffect(() => {
    onBlurRef.current = onBlur;
    formatBarRef.current = formatBar;
  }, [onBlur, formatBar]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions,
      content: toEditorHtmlForParagraph(html),
      editorProps: {
        attributes: {
          class: formatBar ? EDITOR_CANVAS_CLASS : EDITOR_CHROME_CLASS,
        },
        handleDOMEvents: {
          blur: () => {
            onBlurRef.current?.();
            return false;
          },
        },
      },
      onUpdate: ({ editor: ed }) => {
        onHtmlChange(ed.getHTML());
      },
      onFocus: ({ editor: ed }) => formatBarRef.current?.activate(ed),
    },
    [paneKey, extensions]
  );

  // In the canvas the shared formatting bar serves every paragraph, so the
  // text sits on the page like the published article.
  if (formatBar)
    return (
      <EditorContent
        editor={editor}
        className="tiptap-paragraph [&_.ProseMirror]:outline-none"
      />
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/15 transition-all">
      <RichToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="tiptap-paragraph [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}

export default function ParagraphBlockEditor({
  block,
  onChange,
  onBlur,
  localeViewKey,
  localeViewTab = 'original',
  bulkTranslating = false,
}: {
  block: ParagraphBlock;
  onChange: (b: ParagraphBlock) => void;
  onBlur?: () => void;
  localeViewKey?: number;
  localeViewTab?: 'original' | 'english';
  bulkTranslating?: boolean;
}) {
  const t = useTranslations('admin.paragraph');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab, appliedKey] = useLocaleEditTab(
    localeViewKey,
    localeViewTab
  );
  const [generating, setGenerating] = useState(false);
  const [englishEditorTick, setEnglishEditorTick] = useState(0);
  const viewKey = localeViewKey ?? 0;
  if (viewKey > 0 && viewKey !== appliedKey && localeViewTab === 'english') {
    setEnglishEditorTick((x) => x + 1);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'paragraph',
        contentHtml: block.content,
      });
      if (result.type === 'paragraph') {
        const contentEn = paragraphContentToHtml(result.contentEn);
        onChange({ ...block, contentEn });
        setEnglishEditorTick((x) => x + 1);
        setTab('english');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  const hasPrimary = Boolean(stripHtmlForMetrics(block.content).trim());

  // Keyed on the placeholder text, not on `t`: a server refresh (every save
  // revalidates) hands out a new `t`, and new extensions rebuild the editor,
  // which drops the caret mid-sentence.
  const placeholder = t('placeholder');
  const englishPlaceholder = te('englishPlaceholder');
  const extensionsOriginal = useMemo(
    () => createParagraphExtensions(placeholder),
    [placeholder]
  );
  const extensionsEnglish = useMemo(
    () => createParagraphExtensions(englishPlaceholder),
    [englishPlaceholder]
  );

  return (
    <div className="space-y-2">
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        bulkTranslating={bulkTranslating}
        generateDisabled={!hasPrimary}
      />
      {tab === 'original' && (
        <RichParagraphPane
          paneKey={`${block.id}-orig`}
          extensions={extensionsOriginal}
          html={block.content}
          onHtmlChange={(html) => onChange({ ...block, content: html })}
          onBlur={onBlur}
        />
      )}
      {tab === 'english' && (
        <RichParagraphPane
          paneKey={`${block.id}-en-${englishEditorTick}`}
          extensions={extensionsEnglish}
          html={block.contentEn ?? ''}
          onHtmlChange={(html) => onChange({ ...block, contentEn: html })}
          onBlur={onBlur}
        />
      )}
    </div>
  );
}

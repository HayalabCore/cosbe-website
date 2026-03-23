'use client';

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { useTranslations } from 'next-intl';
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
import { escapeHtml } from '@/lib/sanitize-article-html';

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

function toEditorHtml(stored: string): string {
  const raw = stored.trim();
  if (!raw) return '<p></p>';
  if (/^<[a-z]/i.test(raw)) return stored;
  return `<p>${escapeHtml(raw)}</p>`;
}

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
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors shrink-0 ${
        active
          ? 'bg-primaryColor/15 text-primaryColor'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" aria-hidden />;
}

const selectCls =
  'h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:border-primaryColor cursor-pointer shrink-0';

function RichToolbar({ editor }: { editor: Editor | null }) {
  const tt = useTranslations('admin.paragraph.toolbar');
  const tc = useTranslations('admin.paragraph.textColors');
  const th = useTranslations('admin.paragraph.highlights');
  const t = useTranslations('admin.paragraph');

  if (!editor) {
    return (
      <div className="h-10 border-b border-slate-200 bg-slate-50/80 rounded-t-lg animate-pulse" />
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(
      t('linkPromptTitle'),
      prev ?? t('linkPromptDefault')
    );
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run();
  };

  const currentColor =
    (editor.getAttributes('textStyle').color as string | undefined) ?? '';
  const highlightColor =
    (editor.getAttributes('highlight').color as string | undefined) ?? '';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 rounded-t-lg px-2 py-1.5">
      <Btn
        title={tt('bold')}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('italic')}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('underline')}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={14} strokeWidth={2.5} />
      </Btn>
      <Btn
        title={tt('strike')}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={14} strokeWidth={2.5} />
      </Btn>

      <Sep />

      <label
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-colors shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
          value={
            currentColor && /^#/.test(currentColor) ? currentColor : '#374151'
          }
          onInput={(e) =>
            editor
              .chain()
              .focus()
              .setColor((e.target as HTMLInputElement).value)
              .run()
          }
        />
      </label>
      <select
        title={tt('textColorPreset')}
        className={selectCls}
        value={
          TEXT_COLOR_KEYS.some((c) => c.value === currentColor)
            ? currentColor
            : '__custom__'
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (v === '') editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(v).run();
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
        active={editor.isActive('highlight')}
        onClick={() => {
          if (editor.isActive('highlight'))
            editor.chain().focus().unsetHighlight().run();
          else editor.chain().focus().setHighlight({ color: '#fef08a' }).run();
        }}
      >
        <Highlighter
          size={14}
          strokeWidth={2}
          style={{ color: highlightColor || undefined }}
        />
      </Btn>
      <select
        title={tt('highlightColor')}
        className={selectCls}
        value={
          HIGHLIGHT_KEYS.some((h) => h.value === highlightColor)
            ? highlightColor
            : '__custom__'
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') return;
          if (v === '') editor.chain().focus().unsetHighlight().run();
          else editor.chain().focus().setHighlight({ color: v }).run();
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
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('alignCenter')}
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('alignRight')}
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('justify')}
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('bulletList')}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('numberedList')}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('blockquote')}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('addLink')}
        active={editor.isActive('link')}
        onClick={setLink}
      >
        <LinkIcon size={14} strokeWidth={2} />
      </Btn>
      <Btn
        title={tt('removeLink')}
        disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2Off size={14} strokeWidth={2} />
      </Btn>

      <Sep />

      <Btn
        title={tt('clearFormatting')}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
      >
        <RemoveFormatting size={14} strokeWidth={2} />
      </Btn>
    </div>
  );
}

export default function ParagraphBlockEditor({
  block,
  onChange,
}: {
  block: ParagraphBlock;
  onChange: (b: ParagraphBlock) => void;
}) {
  const t = useTranslations('admin.paragraph');

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: t('placeholder') }),
    ],
    [t]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions,
      content: toEditorHtml(block.content),
      editorProps: {
        attributes: {
          class: [
            'prose prose-sm max-w-none focus:outline-none min-h-[140px] px-3 py-2.5 text-slate-900',
            '[&_a]:text-primaryColor [&_a]:underline',
            '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul>li]:my-0.5 [&_ul>li::marker]:text-slate-500',
            '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol>li]:my-0.5 [&_ol>li::marker]:text-slate-500',
            '[&_li>p]:my-0',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-3',
            '[&_mark]:rounded-sm [&_mark]:px-0.5',
          ].join(' '),
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange({ ...block, content: ed.getHTML() });
      },
    },
    [block.id, extensions]
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

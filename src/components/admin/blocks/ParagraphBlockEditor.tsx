'use client';

import type { ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { ParagraphBlock } from '@/types';
import { escapeHtml } from '@/lib/sanitize-article-html';

const extensions = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
  }),
  Placeholder.configure({
    placeholder: 'Write paragraph text…',
  }),
];

function toEditorHtml(stored: string): string {
  const t = stored.trim();
  if (!t) return '<p></p>';
  if (/^<[a-z]/i.test(t)) return stored;
  return `<p>${escapeHtml(t)}</p>`;
}

function ToolbarButton({
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-primaryColor/15 text-primaryColor'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function RichToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return <div className="h-9 border-b border-slate-200 bg-slate-50/80 rounded-t-lg animate-pulse" />;
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-1.5 py-1 rounded-t-lg">
      <ToolbarButton
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <span className="font-mono text-[10px] leading-none">{'<>'}</span>
      </ToolbarButton>
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <ToolbarButton title="Add link" active={editor.isActive('link')} onClick={setLink}>
        Link
      </ToolbarButton>
      <ToolbarButton
        title="Remove link"
        disabled={!editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        Unlink
      </ToolbarButton>
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
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      extensions,
      content: toEditorHtml(block.content),
      editorProps: {
        attributes: {
          class:
            'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2.5 text-slate-900 [&_a]:text-primaryColor [&_a]:underline',
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange({ ...block, content: ed.getHTML() });
      },
    },
    [block.id]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/15 transition-all">
      <RichToolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-paragraph [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none" />
    </div>
  );
}

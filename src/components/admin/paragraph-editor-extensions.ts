import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import type { Extensions } from '@tiptap/core';
import { escapeHtml } from '@/lib/sanitize-article-html';

/**
 * TipTap document HTML for paragraph blocks. Plain text is wrapped in `<p>`;
 * existing HTML is passed through for editor hydration.
 */
export function toEditorHtmlForParagraph(stored: string): string {
  const raw = stored.trim();
  if (!raw) return '<p></p>';
  if (/^<[a-z]/i.test(raw)) return stored;
  return `<p>${escapeHtml(raw)}</p>`;
}

/** Shared stack for Original and English paragraph panes (single Link + Underline). */
export function createParagraphExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      // StarterKit bundles Link + Underline; we register our own below.
      link: false,
      underline: false,
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
    Placeholder.configure({ placeholder }),
  ];
}

import sanitizeHtml from 'sanitize-html';
import * as cheerio from 'cheerio';

const COLOR_STYLE = /^#([0-9a-f]{3,8})$/i;
const RGB_STYLE =
  /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i;

/** Detect inline or block HTML anywhere in a stored string (not only at the start). */
const HTML_MARKUP_RE =
  /<\/?(?:br|strong|em|b|i|u|s|strike|a|span|mark|sub|sup|p|ul|ol|li|blockquote|hr)\b[^>]*>/i;

export function containsHtmlMarkup(stored: string): boolean {
  return HTML_MARKUP_RE.test(stored);
}

/** Rich paragraph HTML from Tiptap (lists, quotes, alignment, colors — no inline code). */
const PARAGRAPH_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'span',
    'a',
    'mark',
    'sub',
    'sup',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class'],
    span: ['class', 'style'],
    mark: ['class', 'style', 'data-color'],
    p: ['class', 'style'],
    ol: ['start', 'class', 'style', 'type'],
    ul: ['class', 'style'],
    li: ['class', 'style'],
    blockquote: ['class', 'style'],
    hr: ['class'],
  },
  allowedClasses: {
    p: ['whitespace-pre-wrap'],
  },
  allowedStyles: {
    '*': {
      color: [COLOR_STYLE, RGB_STYLE],
      'background-color': [COLOR_STYLE, RGB_STYLE],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, PARAGRAPH_SANITIZE);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalize stored paragraph content to TipTap-safe HTML (plain text or inline HTML fragments). */
export function normalizeStoredParagraphHtml(stored: string): string {
  const raw = stored.trim();
  if (!raw) return '';

  if (!containsHtmlMarkup(raw)) {
    return sanitizeArticleHtml(
      `<p class="whitespace-pre-wrap">${escapeHtml(raw)}</p>`
    );
  }

  if (/^<(?:p|ul|ol|blockquote|hr)\b/i.test(raw)) {
    return sanitizeArticleHtml(raw);
  }

  return sanitizeArticleHtml(`<p>${raw}</p>`);
}

/**
 * Flatten inline HTML to plain text for list items (admin list editor is plain-text).
 * Preserves link URLs when they differ from anchor text.
 */
export function inlineHtmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (!containsHtmlMarkup(trimmed)) return trimmed;

  const $ = cheerio.load(`<div>${trimmed}</div>`);
  const root = $('div').first();

  root.find('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href')?.trim();
    const text = $el.text().trim();
    if (href && href !== text && !text.includes(href)) {
      $el.replaceWith(`${text} (${href})`);
    }
  });

  root.find('br').replaceWith('\n');

  return root
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Legacy plain-text paragraphs → safe HTML; inline HTML fragments are wrapped and sanitized. */
export function paragraphContentToHtml(stored: string): string {
  return normalizeStoredParagraphHtml(stored);
}

export function stripHtmlForMetrics(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize legacy/imported block content when loading into the admin editor. */
export function normalizeBlocksForEditor(
  blocks: import('@/types').ContentBlock[]
): import('@/types').ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === 'paragraph') {
      return {
        ...block,
        content: normalizeStoredParagraphHtml(block.content),
        contentEn: block.contentEn
          ? normalizeStoredParagraphHtml(block.contentEn)
          : block.contentEn,
      };
    }
    if (block.type === 'list') {
      return {
        ...block,
        items: block.items.map(inlineHtmlToPlainText),
        itemsEn: block.itemsEn?.map(inlineHtmlToPlainText),
      };
    }
    return block;
  });
}

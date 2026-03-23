import sanitizeHtml from 'sanitize-html';

const COLOR_STYLE = /^#([0-9a-f]{3,8})$/i;
const RGB_STYLE =
  /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i;

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

/** Legacy plain-text paragraphs → safe HTML; already-HTML passes through sanitizer. */
export function paragraphContentToHtml(stored: string): string {
  const t = stored.trim();
  if (!t) return '';
  if (/^<[a-z]/i.test(t)) return sanitizeArticleHtml(t);
  return sanitizeArticleHtml(
    `<p class="whitespace-pre-wrap">${escapeHtml(t)}</p>`
  );
}

export function stripHtmlForMetrics(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

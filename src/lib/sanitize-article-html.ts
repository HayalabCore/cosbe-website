import sanitizeHtml from 'sanitize-html';

/** Options aligned with rich paragraph content from Tiptap (no headings/lists in paragraph block). */
const PARAGRAPH_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'a', 'code'],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class'],
    span: ['class'],
    p: ['class'],
    code: ['class'],
  },
  allowedClasses: {
    p: ['whitespace-pre-wrap'],
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
  return sanitizeArticleHtml(`<p class="whitespace-pre-wrap">${escapeHtml(t)}</p>`);
}

export function stripHtmlForMetrics(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

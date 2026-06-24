import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

const ALLOWED = new Set(['strong', 'em', 'b', 'i', 'a', 'br']);

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

function normalizeTag(tag: string): string {
  if (tag === 'b') return 'strong';
  if (tag === 'i') return 'em';
  return tag;
}

function serializeNode($: CheerioAPI, el: Element): string {
  const tag = el.tagName?.toLowerCase();
  if (!tag) return '';
  if (tag === 'br') return '<br>';

  if (ALLOWED.has(tag)) {
    const norm = normalizeTag(tag);
    if (tag === 'a') {
      const href = el.attribs?.href?.trim() ?? '';
      if (!href || href.toLowerCase().startsWith('javascript:')) {
        return $(el).text();
      }
      const rel =
        href.startsWith('http') && !href.includes('jp.cosbe.inc')
          ? ' rel="noopener noreferrer"'
          : '';
      const inner = $(el)
        .contents()
        .map((_, child) => serializeChild($, child))
        .get()
        .join('');
      return `<a href="${escapeHtmlAttr(href)}"${rel}>${inner}</a>`;
    }
    const inner = $(el)
      .contents()
      .map((_, child) => serializeChild($, child))
      .get()
      .join('');
    return `<${norm}>${inner}</${norm}>`;
  }

  return $(el)
    .contents()
    .map((_, child) => serializeChild($, child))
    .get()
    .join('');
}

function serializeChild($: CheerioAPI, node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; data?: string; name?: string };
  if (n.type === 'text') return n.data ?? '';
  if (n.type === 'tag') return serializeNode($, node as Element);
  return '';
}

/** Sanitize paragraph inner HTML to an allowlisted subset. */
export function sanitizeParagraphHtml(
  $: CheerioAPI,
  $el: Cheerio<Element>
): string {
  return $el
    .contents()
    .map((_, child) => serializeChild($, child))
    .get()
    .join('')
    .trim();
}

export function resolveUrl(src: string, baseUrl: string): string {
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

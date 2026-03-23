import type { ContentBlock, HeadingBlock } from '@/types';
import { stripHtmlForMetrics } from '@/lib/sanitize-article-html';

/** Next/Image throws if `src` is not a valid absolute URL or root-relative path. */
export function imageSrcOrFallback(
  raw: string | undefined | null,
  fallback: string
): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return fallback;
  if (s.startsWith('/')) return s;
  if (s.startsWith('//')) {
    try {
      new URL(`https:${s}`);
      return `https:${s}`;
    } catch {
      return fallback;
    }
  }
  try {
    new URL(s);
    return s;
  } catch {
    return fallback;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateTOC(blocks: ContentBlock[]) {
  return blocks
    .filter((block): block is HeadingBlock => block.type === 'heading')
    .map((block) => ({
      id: block.id,
      level: block.level,
      text: block.content,
    }));
}

export function normalizeSlugInput(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function sanitizeSlug(value: string): string {
  return normalizeSlugInput(value).replace(/^-+|-+$/g, '');
}

export function generateSlug(title: string): string {
  return sanitizeSlug(title);
}

export function createFallbackSlug(seed?: string): string {
  const candidate = sanitizeSlug(seed ?? '');
  if (candidate) return candidate;
  return `article-${generateId().slice(0, 8)}`;
}

export function generateExcerpt(
  blocks: ContentBlock[],
  maxLength = 160
): string {
  const paragraphs = blocks.filter((b) => b.type === 'paragraph');
  if (paragraphs.length === 0) return '';

  const raw = (paragraphs[0] as { content: string }).content;
  const firstParagraph = stripHtmlForMetrics(raw);
  if (firstParagraph.length <= maxLength) return firstParagraph;

  return firstParagraph.substring(0, maxLength).trim() + '...';
}

export function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  const id = generateId();

  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, content: '' };
    case 'paragraph':
      return { id, type: 'paragraph', content: '' };
    case 'list':
      return { id, type: 'list', listType: 'bullet', items: [''] };
    case 'quote':
      return { id, type: 'quote', content: '' };
    case 'callout':
      return { id, type: 'callout', variant: 'info', content: '' };
    case 'image':
      return { id, type: 'image', url: '', alt: '' };
    case 'code':
      return { id, type: 'code', language: 'javascript', code: '' };
    case 'divider':
      return { id, type: 'divider' };
    case 'embed':
      return { id, type: 'embed', embedType: 'youtube', url: '' };
    default:
      return { id, type: 'paragraph', content: '' };
  }
}

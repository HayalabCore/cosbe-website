import {
  paragraphContentToHtml,
  stripHtmlForMetrics,
} from '@/lib/sanitize-article-html';
import type { ContentBlock } from '@/types';

export type TranslateBlockPayload =
  | { type: 'heading'; content: string }
  | { type: 'paragraph'; contentHtml: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; content: string; citation?: string }
  | { type: 'callout'; title?: string; content: string }
  | { type: 'image'; alt: string; caption?: string }
  | { type: 'embed'; title?: string }
  | {
      type: 'table';
      title?: string;
      subtitle?: string;
      headers: string[];
      rows: string[][];
      caption?: string;
    };

export type TranslateBlockResult =
  | { type: 'heading'; contentEn: string }
  | { type: 'paragraph'; contentEn: string }
  | { type: 'list'; itemsEn: string[] }
  | { type: 'quote'; contentEn: string; citationEn?: string }
  | { type: 'callout'; titleEn?: string; contentEn: string }
  | { type: 'image'; altEn: string; captionEn?: string }
  | { type: 'embed'; titleEn?: string }
  | {
      type: 'table';
      titleEn?: string;
      subtitleEn?: string;
      headersEn: string[];
      rowsEn: string[][];
      captionEn?: string;
    };

export type BlockTranslationError = {
  blockId: string;
  message: string;
};

export function isTranslatableBlock(block: ContentBlock): boolean {
  return block.type !== 'code' && block.type !== 'divider';
}

export function hasTranslatablePrimaryContent(block: ContentBlock): boolean {
  switch (block.type) {
    case 'heading':
      return Boolean(block.content.trim());
    case 'paragraph':
      return Boolean(stripHtmlForMetrics(block.content).trim());
    case 'list':
      return block.items.some((s) => s.trim().length > 0);
    case 'quote':
    case 'callout':
      return Boolean(block.content.trim());
    case 'image':
      return Boolean(block.alt.trim());
    case 'embed':
      return Boolean(block.title?.trim());
    case 'table':
      return (
        block.headers.some((h) => h.trim()) ||
        block.rows.some((r) => r.some((c) => c.trim()))
      );
    default:
      return false;
  }
}

export function articleHasTranslatableContent(
  title: string,
  blocks: ContentBlock[]
): boolean {
  if (title.trim()) return true;
  return blocks.some(
    (b) => isTranslatableBlock(b) && hasTranslatablePrimaryContent(b)
  );
}

export function blockToTranslatePayload(
  block: ContentBlock
): TranslateBlockPayload | null {
  if (!isTranslatableBlock(block) || !hasTranslatablePrimaryContent(block)) {
    return null;
  }

  switch (block.type) {
    case 'heading':
      return { type: 'heading', content: block.content };
    case 'paragraph':
      return { type: 'paragraph', contentHtml: block.content };
    case 'list':
      return { type: 'list', items: block.items };
    case 'quote':
      return {
        type: 'quote',
        content: block.content,
        citation: block.citation,
      };
    case 'callout':
      return {
        type: 'callout',
        title: block.title,
        content: block.content,
      };
    case 'image':
      return {
        type: 'image',
        alt: block.alt,
        caption: block.caption,
      };
    case 'embed':
      return { type: 'embed', title: block.title };
    case 'table':
      return {
        type: 'table',
        title: block.title,
        subtitle: block.subtitle,
        headers: block.headers,
        rows: block.rows,
        caption: block.caption,
      };
    default:
      return null;
  }
}

export function applyBlockTranslation(
  block: ContentBlock,
  result: TranslateBlockResult
): ContentBlock {
  switch (result.type) {
    case 'heading':
      if (block.type !== 'heading') return block;
      return { ...block, contentEn: result.contentEn };
    case 'paragraph':
      if (block.type !== 'paragraph') return block;
      return {
        ...block,
        contentEn: paragraphContentToHtml(result.contentEn),
      };
    case 'list':
      if (block.type !== 'list') return block;
      return { ...block, itemsEn: result.itemsEn };
    case 'quote':
      if (block.type !== 'quote') return block;
      return {
        ...block,
        contentEn: result.contentEn,
        citationEn: result.citationEn,
      };
    case 'callout':
      if (block.type !== 'callout') return block;
      return {
        ...block,
        titleEn: result.titleEn,
        contentEn: result.contentEn,
      };
    case 'image':
      if (block.type !== 'image') return block;
      return {
        ...block,
        altEn: result.altEn,
        captionEn: result.captionEn,
      };
    case 'embed':
      if (block.type !== 'embed') return block;
      return { ...block, titleEn: result.titleEn };
    case 'table':
      if (block.type !== 'table') return block;
      return {
        ...block,
        titleEn: result.titleEn,
        subtitleEn: result.subtitleEn,
        headersEn: result.headersEn,
        rowsEn: result.rowsEn,
        captionEn: result.captionEn,
      };
    default:
      return block;
  }
}

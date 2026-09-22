import type { ContentBlock } from '@/types';
import type { Segment } from '../text/chunker';

const SEPARATOR = '\n\n';

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Primary-language (JA) text of one block; code, dividers and embeds are skipped. */
function blockText(block: ContentBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return stripHtml(block.content);
    case 'quote':
      return [stripHtml(block.content), block.citation ?? '']
        .filter(Boolean)
        .join('\n');
    case 'callout':
      return [block.title ?? '', stripHtml(block.content)]
        .filter(Boolean)
        .join('\n');
    case 'list':
      return block.items.map((item) => `・${stripHtml(item)}`).join('\n');
    case 'image':
      return block.caption ?? '';
    case 'table':
      return [
        block.title ?? '',
        block.subtitle ?? '',
        block.headers.join(' | '),
        ...block.rows.map((row) => row.join(' | ')),
        block.caption ?? '',
      ]
        .filter(Boolean)
        .join('\n');
    default:
      return '';
  }
}

/** One segment per heading-delimited group so chunks stay within a section. */
export function articleToSegments(blocks: ContentBlock[]): {
  text: string;
  segments: Segment[];
} {
  const groups: Array<{ blockId: string; parts: string[] }> = [];
  for (const block of blocks) {
    const text = blockText(block);
    if (block.type === 'heading' || groups.length === 0) {
      groups.push({ blockId: block.id, parts: [] });
    }
    if (text) groups[groups.length - 1].parts.push(text);
  }
  const segments: Segment[] = [];
  let text = '';
  for (const group of groups) {
    const body = group.parts.join('\n');
    if (!body) continue;
    if (text) text += SEPARATOR;
    segments.push({
      text: body,
      start: text.length,
      locator: { blockId: group.blockId },
    });
    text += body;
  }
  return { text, segments };
}

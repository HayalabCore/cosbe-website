import { randomUUID } from 'node:crypto';
import type { ContentBlock } from '@/types';
import type { EnBlock, Section, Sentence, StudioBlock } from './piece-types';

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
const joined = (sentences: Sentence[]) => sentences.map((s) => s.text).join('');
const p = (text: string) => `<p>${escape(text)}</p>`;

function convert(
  block: StudioBlock,
  en: EnBlock | undefined,
  id: string
): ContentBlock {
  switch (block.type) {
    case 'paragraph':
      return {
        id,
        type: 'paragraph',
        content: p(joined(block.sentences)),
        ...(en?.type === 'paragraph' ? { contentEn: p(en.text) } : {}),
      };
    case 'quote':
      return {
        id,
        type: 'quote',
        content: joined(block.sentences),
        ...(en?.type === 'quote' ? { contentEn: en.text } : {}),
      };
    case 'callout':
      return {
        id,
        type: 'callout',
        variant: 'info',
        title: block.title,
        content: p(joined(block.sentences)),
        ...(en?.type === 'callout'
          ? { titleEn: en.title, contentEn: p(en.text) }
          : {}),
      };
    case 'list':
      return {
        id,
        type: 'list',
        listType: 'bullet',
        items: block.items.map((i) => i.text),
        ...(en?.type === 'list' ? { itemsEn: en.items } : {}),
      };
    case 'heading3':
      return {
        id,
        type: 'heading',
        level: 3,
        content: block.text,
        ...(en?.type === 'heading3' ? { contentEn: en.text } : {}),
      };
    case 'table':
      return {
        id,
        type: 'table',
        headers: block.headers,
        rows: block.rows,
        ...(en?.type === 'table'
          ? { headersEn: en.headers, rowsEn: en.rows }
          : {}),
      };
  }
}

/** Studio sections → cosbe blocks. Citations stay in the studio. */
export function toArticleBlocks(
  sections: Section[],
  newId: () => string = randomUUID
): ContentBlock[] {
  const out: ContentBlock[] = [];
  for (const section of sections) {
    const en = section.en && !section.enStale ? section.en : null;
    out.push({
      id: newId(),
      type: 'heading',
      level: 2,
      content: section.heading,
      ...(en ? { contentEn: en.heading } : {}),
    });
    section.blocks.forEach((block, i) =>
      out.push(convert(block, en?.blocks[i], newId()))
    );
  }
  return out;
}

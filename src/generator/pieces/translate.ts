import { z } from 'zod';
import { generateStructured, type AiCallOptions } from '@/ai/generate';
import { instructions } from '@/ai/prompts/translate.v1';
import { enSectionSchema, type Section, type StudioBlock } from './piece-types';

/** The Japanese structure without citations, as the translator sees it. */
function plain(blocks: StudioBlock[]) {
  return blocks.map((b) => {
    switch (b.type) {
      case 'paragraph': case 'quote':
        return { type: b.type, text: b.sentences.map((s) => s.text).join('') };
      case 'callout':
        return { type: b.type, title: b.title, text: b.sentences.map((s) => s.text).join('') };
      case 'list':
        return { type: b.type, items: b.items.map((i) => i.text) };
      case 'heading3':
        return { type: b.type, text: b.text };
      case 'table':
        return { type: b.type, headers: b.headers, rows: b.rows };
    }
  });
}

export async function translateSection(
  section: Section,
  options: AiCallOptions = {}
): Promise<NonNullable<Section['en']>> {
  const en = await generateStructured(
    'translate',
    {
      schema: enSectionSchema,
      schemaName: 'section_translation',
      instructions: instructions(),
      prompt: JSON.stringify({ heading: section.heading, blocks: plain(section.blocks) }),
    },
    options
  );
  const same =
    en.blocks.length === section.blocks.length &&
    en.blocks.every((b, i) => b.type === section.blocks[i].type);
  if (!same) throw new Error('Translation structure does not match the Japanese section.');
  return en;
}

const metaSchema = z.object({ titleEn: z.string(), excerptEn: z.string() });

export function translateMeta(
  input: { title: string; excerpt: string },
  options: AiCallOptions = {}
): Promise<{ titleEn: string; excerptEn: string }> {
  return generateStructured(
    'translate',
    {
      schema: metaSchema,
      schemaName: 'meta_translation',
      instructions: 'Translate the Japanese article title and excerpt into natural English. Add nothing.',
      prompt: JSON.stringify(input),
    },
    options
  );
}

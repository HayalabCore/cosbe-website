import { z } from 'zod';
import { generateStructured, type AiCallOptions } from '@/ai/generate';
import { instructions } from '@/ai/prompts/translate.v1';
import { NonRetryableRunError } from '../runs/run-types';
import {
  enSectionSchema,
  type EnBlock,
  type Section,
  type StudioBlock,
} from './piece-types';

/** The Japanese structure without citations, as the translator sees it. */
function plain(blocks: StudioBlock[]) {
  return blocks.map((b) => {
    switch (b.type) {
      case 'paragraph':
      case 'quote':
        return { type: b.type, text: b.sentences.map((s) => s.text).join('') };
      case 'callout':
        return {
          type: b.type,
          title: b.title,
          text: b.sentences.map((s) => s.text).join(''),
        };
      case 'list':
        return { type: b.type, items: b.items.map((i) => i.text) };
      case 'heading3':
        return { type: b.type, text: b.text };
      case 'table':
        return { type: b.type, headers: b.headers, rows: b.rows };
    }
  });
}

/**
 * The EN side is mapped onto the JA blocks by index (and list items and table
 * cells by position), so any difference in shape misaligns the public page.
 */
export function shapeProblems(ja: StudioBlock[], en: EnBlock[]): string[] {
  if (en.length !== ja.length)
    return [`Expected ${ja.length} blocks, got ${en.length}.`];
  const out: string[] = [];
  ja.forEach((j, i) => {
    const e = en[i];
    if (e.type !== j.type) {
      out.push(`Block ${i + 1} must be a ${j.type}, not a ${e.type}.`);
    } else if (j.type === 'list' && e.type === 'list') {
      if (e.items.length !== j.items.length)
        out.push(
          `List ${i + 1} must have ${j.items.length} items, got ${e.items.length}.`
        );
    } else if (j.type === 'table' && e.type === 'table') {
      const same =
        e.headers.length === j.headers.length &&
        e.rows.length === j.rows.length &&
        e.rows.every((row, r) => row.length === j.rows[r].length);
      if (!same)
        out.push(
          `Table ${i + 1} must keep its ${j.headers.length} columns and ${j.rows.length} rows.`
        );
    }
  });
  return out;
}

export async function translateSection(
  section: Section,
  options: AiCallOptions = {}
): Promise<NonNullable<Section['en']>> {
  const source = JSON.stringify({
    heading: section.heading,
    blocks: plain(section.blocks),
  });
  const call = (prompt: string) =>
    generateStructured(
      'translate',
      {
        schema: enSectionSchema,
        schemaName: 'section_translation',
        instructions: instructions(),
        prompt,
      },
      options
    );
  let en = await call(source);
  let problems = shapeProblems(section.blocks, en.blocks);
  if (problems.length > 0) {
    // One repair: a mismatch is usually a one-off slip the model can fix.
    en = await call(
      [
        source,
        `Your previous translation broke the structure:\n${problems.map((p) => `- ${p}`).join('\n')}`,
        'Translate again, keeping every block, list item and table cell.',
      ].join('\n\n')
    );
    problems = shapeProblems(section.blocks, en.blocks);
  }
  if (problems.length > 0) {
    throw new NonRetryableRunError(`TRANSLATION_SHAPE:${section.heading}`);
  }
  return en;
}

export const metaSchema = z.object({ titleEn: z.string(), excerptEn: z.string() });

export function translateMeta(
  input: { title: string; excerpt: string },
  options: AiCallOptions = {}
): Promise<{ titleEn: string; excerptEn: string }> {
  return generateStructured(
    'translate',
    {
      schema: metaSchema,
      schemaName: 'meta_translation',
      instructions:
        'Translate the Japanese article title and excerpt into natural English. Add nothing.',
      prompt: JSON.stringify(input),
    },
    options
  );
}

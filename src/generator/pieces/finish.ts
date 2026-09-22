import { z } from 'zod';
import { generateStructured, type AiCallOptions } from '@/ai/generate';
import { instructions } from '@/ai/prompts/finish.v1';
import { sectionPlainText, seoSchema, type Brief, type PieceSeo, type Section } from './piece-types';

const finishSchema = z.object({ title: z.string(), excerpt: z.string(), seo: seoSchema });

export async function finishArticle(
  sections: Section[],
  brief: Brief,
  options: AiCallOptions = {}
): Promise<{ title: string; excerpt: string; seo: PieceSeo }> {
  return generateStructured(
    'finish',
    {
      schema: finishSchema,
      schemaName: 'article_finish',
      instructions: instructions(),
      prompt: [`Goal: ${brief.goal}`, '<article>', sections.map(sectionPlainText).join('\n\n'), '</article>'].join('\n'),
    },
    options
  );
}

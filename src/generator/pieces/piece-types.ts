import { z } from 'zod';

export const PIECE_STAGES = [
  'sources',
  'brief',
  'outline',
  'writing',
  'review',
  'translating',
  'ready',
  'handed_off',
] as const;
export type PieceStage = (typeof PIECE_STAGES)[number];

/** Stored briefs stay loose so an older row still reads. Writes use the limits below. */
export const briefSchema = z.object({
  goal: z.string().default(''),
  audience: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  tone: z.string().default(''),
  targetLength: z
    .union([z.number().int().positive(), z.literal('auto')])
    .default('auto'),
});
export type Brief = z.infer<typeof briefSchema>;

export const MAX_BRIEF_CHARS = 4_000;
export const MAX_KEYWORDS = 30;
export const MAX_KEYWORD_CHARS = 80;
export const MAX_SELECTED_SOURCES = 40;

export const briefInputSchema = z.object({
  goal: z.string().max(MAX_BRIEF_CHARS).default(''),
  audience: z.string().max(MAX_BRIEF_CHARS).default(''),
  keywords: z
    .array(z.string().max(MAX_KEYWORD_CHARS))
    .max(MAX_KEYWORDS)
    .default([]),
  tone: z.string().max(MAX_BRIEF_CHARS).default(''),
  targetLength: z
    .union([z.number().int().positive().max(50_000), z.literal('auto')])
    .default('auto'),
});

export const selectionSchema = z.object({
  sourceIds: z.array(z.string()).default([]),
  chapters: z.record(z.string(), z.array(z.number().int())).default({}),
});
export type Selection = z.infer<typeof selectionSchema>;

export const selectionInputSchema = z
  .object({
    sourceIds: z.array(z.uuid()).max(MAX_SELECTED_SOURCES).default([]),
    chapters: z
      .record(z.string(), z.array(z.number().int().nonnegative()).max(500))
      .default({}),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value.chapters).length > MAX_SELECTED_SOURCES) {
      ctx.addIssue({
        code: 'custom',
        path: ['chapters'],
        message: 'Too many chapter maps',
      });
    }
  });

/** Chapter-map key order must not look like a different selection. */
export function sameSelection(a: Selection, b: Selection): boolean {
  const ids = (selection: Selection) => [...selection.sourceIds].sort();
  const left = ids(a);
  const right = ids(b);
  if (left.length !== right.length || left.some((id, i) => id !== right[i]))
    return false;
  const keys = new Set([
    ...Object.keys(a.chapters),
    ...Object.keys(b.chapters),
  ]);
  for (const key of keys) {
    const x = [...(a.chapters[key] ?? [])].sort((m, n) => m - n);
    const y = [...(b.chapters[key] ?? [])].sort((m, n) => m - n);
    if (x.length !== y.length || x.some((n, i) => n !== y[i])) return false;
  }
  return true;
}

export const outlineSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  intent: z.string(),
  chunkIds: z.array(z.string()),
  estChars: z.number().int().nonnegative(),
  kind: z.enum(['source', 'boilerplate']),
  stale: z.boolean().default(false),
});
export type OutlineSection = z.infer<typeof outlineSectionSchema>;

const sentenceSchema = z.object({
  text: z.string(),
  cite: z.array(z.string()),
  connective: z.boolean(),
});
export type Sentence = z.infer<typeof sentenceSchema>;

/** Also the model's output shape; there `cite` holds aliases (c1, c2…). */
export const studioBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    sentences: z.array(sentenceSchema),
  }),
  z.object({ type: z.literal('list'), items: z.array(sentenceSchema) }),
  z.object({ type: z.literal('heading3'), text: z.string() }),
  z.object({
    type: z.literal('callout'),
    title: z.string(),
    sentences: z.array(sentenceSchema),
  }),
  z.object({ type: z.literal('quote'), sentences: z.array(sentenceSchema) }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    cite: z.array(z.string()),
  }),
]);
export type StudioBlock = z.infer<typeof studioBlockSchema>;
export const modelBlockSchema = studioBlockSchema;

export const modelSectionSchema = z.object({
  blocks: z.array(studioBlockSchema),
});

export const enBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({ type: z.literal('heading3'), text: z.string() }),
  z.object({ type: z.literal('callout'), title: z.string(), text: z.string() }),
  z.object({ type: z.literal('quote'), text: z.string() }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
]);
export type EnBlock = z.infer<typeof enBlockSchema>;
export const enSectionSchema = z.object({
  heading: z.string(),
  blocks: z.array(enBlockSchema),
});

export const sectionSchema = z.object({
  outlineId: z.string(),
  heading: z.string(),
  blocks: z.array(studioBlockSchema),
  flags: z.array(z.string()).default([]),
  enStale: z.boolean().default(false),
  en: enSectionSchema.nullable().default(null),
});
export type Section = z.infer<typeof sectionSchema>;

export const seoSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
});
export type PieceSeo = z.infer<typeof seoSchema>;

function sentencesText(sentences: Sentence[]): string {
  return sentences.map((s) => s.text).join('');
}

/** JA plain text of a section, for finish/translate prompts and previews. */
export function sectionPlainText(section: Section): string {
  const parts = [section.heading];
  for (const block of section.blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'quote':
        parts.push(sentencesText(block.sentences));
        break;
      case 'callout':
        parts.push(
          [block.title, sentencesText(block.sentences)]
            .filter(Boolean)
            .join('\n')
        );
        break;
      case 'list':
        parts.push(block.items.map((i) => `・${i.text}`).join('\n'));
        break;
      case 'heading3':
        parts.push(block.text);
        break;
      case 'table':
        parts.push(
          [
            block.headers.join(' | '),
            ...block.rows.map((r) => r.join(' | ')),
          ].join('\n')
        );
        break;
    }
  }
  return parts.join('\n\n');
}

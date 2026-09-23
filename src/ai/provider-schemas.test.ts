import { asSchema } from 'ai';
import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { finishSchema } from '@/generator/pieces/finish';
import { outlineSchema } from '@/generator/pieces/outline';
import { enSectionSchema, modelSectionSchema } from '@/generator/pieces/piece-types';
import { metaSchema } from '@/generator/pieces/translate';
import { digestSchema } from '@/generator/sources/digest';

/**
 * Mock models accept any schema, so these checks stand in for the provider:
 * OpenAI structured output rejects `oneOf` (it needs `anyOf`) before the model
 * runs, which would fail every call of that kind.
 */
const MODEL_SCHEMAS: Record<string, ZodType> = {
  article_section: modelSectionSchema,
  section_translation: enSectionSchema,
  article_outline: outlineSchema,
  article_finish: finishSchema,
  meta_translation: metaSchema,
  source_digest: digestSchema,
};

describe('schemas sent to model providers', () => {
  for (const [name, schema] of Object.entries(MODEL_SCHEMAS)) {
    it(`${name} uses only JSON Schema that OpenAI structured output accepts`, async () => {
      const json = JSON.stringify(await asSchema(schema).jsonSchema);
      expect(json).not.toContain('"oneOf"');
      expect(json).not.toContain('"allOf"');
    });
  }
});

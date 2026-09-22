import { describe, expect, it, vi } from 'vitest';
import { MockEmbeddingModelV4, MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';
import { embedTexts, generatePlainText, generateStructured } from './generate';
import { EMBEDDING_DIMENSIONS } from './models';

function textModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

const outlineSchema = z.object({
  title: z.string(),
  sections: z.array(z.string()),
});

describe('generateStructured', () => {
  it('returns the parsed object and reports usage', async () => {
    const onUsage = vi.fn();
    const result = await generateStructured(
      'outline',
      {
        schema: outlineSchema,
        schemaName: 'outline',
        instructions: 'Plan the article.',
        prompt: 'Sources…',
      },
      {
        model: textModel(JSON.stringify({ title: 'T', sections: ['a', 'b'] })),
        onUsage,
      }
    );
    expect(result).toEqual({ title: 'T', sections: ['a', 'b'] });
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 5 });
  });

  it('checks the budget before calling the model', async () => {
    const model = textModel(JSON.stringify({ title: 'T', sections: [] }));
    const ensureBudget = vi.fn(async () => {
      throw new Error('over budget');
    });
    await expect(
      generateStructured(
        'outline',
        {
          schema: outlineSchema,
          schemaName: 'outline',
          instructions: 'Plan.',
          prompt: 'Sources',
        },
        { model, ensureBudget }
      )
    ).rejects.toThrow('over budget');
    expect(ensureBudget).toHaveBeenCalledWith(expect.any(Number));
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('rejects output that does not match the schema', async () => {
    await expect(
      generateStructured(
        'outline',
        {
          schema: outlineSchema,
          schemaName: 'outline',
          instructions: 'Plan.',
          prompt: 'x',
        },
        { model: textModel(JSON.stringify({ title: 1 })) }
      )
    ).rejects.toThrow();
  });

  it('sends the instructions and the prompt to the model', async () => {
    const model = textModel(JSON.stringify({ title: 'T', sections: [] }));
    await generateStructured(
      'outline',
      {
        schema: outlineSchema,
        schemaName: 'outline',
        instructions: 'SYSTEM RULES',
        prompt: 'USER MATERIAL',
      },
      { model }
    );
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(sent).toContain('SYSTEM RULES');
    expect(sent).toContain('USER MATERIAL');
  });
});

describe('generatePlainText', () => {
  it('returns the text and reports usage', async () => {
    const onUsage = vi.fn();
    const text = await generatePlainText(
      'translate',
      { instructions: 'Translate to English.', prompt: 'こんにちは' },
      { model: textModel('Hello'), onUsage }
    );
    expect(text).toBe('Hello');
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 12, outputTokens: 5 });
  });
});

describe('embedTexts', () => {
  const vector = (n: number) =>
    Array.from({ length: EMBEDDING_DIMENSIONS }, () => n);

  it('returns one vector per value and reports tokens as input', async () => {
    const onUsage = vi.fn();
    const model = new MockEmbeddingModelV4({
      maxEmbeddingsPerCall: 100,
      doEmbed: {
        embeddings: [vector(0.1), vector(0.2)],
        usage: { tokens: 7 },
        warnings: [],
      },
    });
    const vectors = await embedTexts(['a', 'b'], { model, onUsage });
    expect(vectors).toHaveLength(2);
    expect(vectors[1][0]).toBe(0.2);
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 7, outputTokens: 0 });
  });

  it('rejects vectors of the wrong size', async () => {
    const model = new MockEmbeddingModelV4({
      doEmbed: { embeddings: [[1, 2, 3]], usage: { tokens: 1 }, warnings: [] },
    });
    await expect(embedTexts(['a'], { model })).rejects.toThrow(
      `expected ${EMBEDDING_DIMENSIONS}`
    );
  });

  it('checks the budget before embedding', async () => {
    const model = new MockEmbeddingModelV4({
      doEmbed: {
        embeddings: [vector(0.1)],
        usage: { tokens: 1 },
        warnings: [],
      },
    });
    const ensureBudget = vi.fn(async () => {
      throw new Error('over budget');
    });
    await expect(
      embedTexts(['hello'], { model, ensureBudget })
    ).rejects.toThrow('over budget');
    expect(model.doEmbedCalls).toHaveLength(0);
  });

  it('returns [] without calling the model for no input', async () => {
    const model = new MockEmbeddingModelV4();
    expect(await embedTexts([], { model })).toEqual([]);
    expect(model.doEmbedCalls).toHaveLength(0);
  });
});

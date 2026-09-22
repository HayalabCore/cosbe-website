import { describe, expect, it } from 'vitest';
import {
  embeddingSpec,
  languageModelForTask,
  modelSpecForTask,
  parseModelSpec,
} from './models';

describe('parseModelSpec', () => {
  it('splits provider and model id', () => {
    expect(parseModelSpec('openai:gpt-4o-mini')).toEqual({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
    });
  });

  it('keeps colons that belong to the model id', () => {
    expect(parseModelSpec('openai:ft:gpt-4o-mini:org:abc').modelId).toBe(
      'ft:gpt-4o-mini:org:abc'
    );
  });

  it.each(['gpt-4o', ':gpt-4o', 'openai:'])('rejects "%s"', (spec) => {
    expect(() => parseModelSpec(spec)).toThrow('Invalid model spec');
  });

  it('rejects providers without an implementation', () => {
    expect(() => parseModelSpec('mistral:large')).toThrow(
      'Unsupported AI provider'
    );
  });
});

describe('modelSpecForTask', () => {
  it('uses the per-task env override', () => {
    expect(
      modelSpecForTask('write', { STUDIO_MODEL_WRITE: 'openai:custom-model' })
        .modelId
    ).toBe('custom-model');
  });

  it('defaults translate to the small model', () => {
    expect(modelSpecForTask('translate', {}).modelId).toBe('gpt-4o-mini');
  });

  it('defaults digest to the strong model (digests feed outlines)', () => {
    expect(modelSpecForTask('digest', {}).modelId).toBe('gpt-4o');
  });

  it('defaults embeddings to text-embedding-3-small', () => {
    expect(embeddingSpec({}).modelId).toBe('text-embedding-3-small');
  });
});

describe('languageModelForTask', () => {
  it('requires OPENAI_API_KEY', () => {
    expect(() => languageModelForTask('write', {})).toThrow(
      'OPENAI_API_KEY is not set'
    );
  });

  it('builds a model for the configured id', () => {
    const model = languageModelForTask('write', {
      OPENAI_API_KEY: 'sk-test',
      STUDIO_MODEL_WRITE: 'openai:my-model',
    });
    expect(typeof model === 'object' && model.modelId).toBe('my-model');
  });
});

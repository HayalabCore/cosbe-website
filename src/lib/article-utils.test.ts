import { describe, expect, it } from 'vitest';
import {
  createFallbackSlug,
  pickUniqueSlug,
  resolveArticleSlug,
  sanitizeSlug,
} from './article-utils';

const jpAiTitle = 'AIコンサル会社の選び方｜経営理解の深さをどう見るか';

describe('sanitizeSlug', () => {
  it('strips Japanese and keeps a short latin remnant', () => {
    expect(sanitizeSlug(jpAiTitle)).toBe('ai');
  });
});

describe('createFallbackSlug', () => {
  it('keeps a meaningful title-derived slug', () => {
    expect(createFallbackSlug('Hello World')).toBe('hello-world');
  });

  it('does not use a 2-letter remnant from a Japanese title', () => {
    const slug = createFallbackSlug(jpAiTitle);
    expect(slug).not.toBe('ai');
    expect(slug).toMatch(/^article-[0-9a-f]{8}$/);
  });

  it('uses article-* when the title contains Japanese script', () => {
    expect(createFallbackSlug('LLM導入事例')).toMatch(/^article-[0-9a-f]{8}$/);
    expect(createFallbackSlug('AWSと生成AI')).toMatch(/^article-[0-9a-f]{8}$/);
    expect(createFallbackSlug('GPT活用ガイド')).toMatch(/^article-[0-9a-f]{8}$/);
  });

  it('keeps a readable slug for English punctuation and accents', () => {
    expect(createFallbackSlug('Café menu')).toBe('cafe-menu');
    expect(createFallbackSlug('Hello—World')).toBe('hello-world');
  });

  it('generates article-* when the seed is empty', () => {
    expect(createFallbackSlug('')).toMatch(/^article-[0-9a-f]{8}$/);
  });
});

describe('resolveArticleSlug', () => {
  it('keeps a user-typed slug even when short', () => {
    expect(resolveArticleSlug('ai', jpAiTitle, 'something')).toBe('ai');
  });

  it('keeps the persisted slug when the field is cleared', () => {
    expect(resolveArticleSlug('', jpAiTitle, 'something')).toBe('something');
  });

  it('falls back from the title when there is no typed or persisted slug', () => {
    expect(resolveArticleSlug('', 'Hello World')).toBe('hello-world');
  });
});

describe('pickUniqueSlug', () => {
  it('returns the desired slug when it is free', () => {
    expect(pickUniqueSlug('Hello World', new Set())).toBe('hello-world');
  });

  it('appends -2, -3, … when the base is taken', () => {
    expect(pickUniqueSlug('hello-world', new Set(['hello-world']))).toBe(
      'hello-world-2'
    );
    expect(
      pickUniqueSlug('hello-world', new Set(['hello-world', 'hello-world-2']))
    ).toBe('hello-world-3');
  });
});

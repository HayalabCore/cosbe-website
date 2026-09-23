import { describe, expect, it } from 'vitest';
import { keywordTerms } from './keywords';

describe('keywordTerms', () => {
  it('splits Japanese on particles and punctuation', () => {
    expect(keywordTerms('AI導入のメリットと注意点')).toEqual([
      'AI導入',
      'メリット',
      '注意点',
    ]);
  });

  it('drops query syntax and one-character fragments', () => {
    const terms = keywordTerms('a (b "OR" -c 見出し「引用」');
    expect(terms.join(' ')).not.toMatch(/[()"「」]/);
    expect(terms).toContain('見出'); // okurigana is a separator; 見出 still matches 見出し
    expect(terms).toContain('引用');
    expect(terms).not.toContain('a');
  });

  it('dedupes and caps the number of terms', () => {
    expect(keywordTerms('営業 営業 営業')).toEqual(['営業']);
    const many = Array.from({ length: 30 }, (_, i) => `term${i}`).join(' ');
    expect(keywordTerms(many)).toHaveLength(10);
  });

  it('returns nothing for text with no content words', () => {
    expect(keywordTerms('は、の。')).toEqual([]);
  });
});

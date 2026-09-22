import { describe, expect, it } from 'vitest';
import { chunkSegments } from './chunker';
import { contentHash } from './hash';
import { detectLanguage } from './language';
import { splitSentences } from './sentences';

describe('detectLanguage', () => {
  it('detects Japanese, English and mixed text', () => {
    expect(
      detectLanguage('製造業のDXを進めるための三つの手順を紹介します。')
    ).toBe('ja');
    expect(
      detectLanguage('Three steps to start AI adoption in manufacturing.')
    ).toBe('en');
    expect(
      detectLanguage(
        'AI adoption guide。導入の手順 and pricing overview for teams'
      )
    ).toBe('mixed');
  });
});

describe('splitSentences', () => {
  it('splits Japanese on 。！？ and keeps offsets', () => {
    const text = 'まず課題を定義します。次に小さく試します！結果は？';
    const s = splitSentences(text);
    expect(s.map((x) => x.text)).toEqual([
      'まず課題を定義します。',
      '次に小さく試します！',
      '結果は？',
    ]);
    for (const x of s) expect(text.slice(x.start, x.end)).toBe(x.text);
  });

  it('splits English on . ! ? followed by whitespace', () => {
    const s = splitSentences('First step. Second step! Third?');
    expect(s.map((x) => x.text.trim())).toEqual([
      'First step.',
      'Second step!',
      'Third?',
    ]);
  });

  it('treats blank lines as sentence breaks', () => {
    expect(splitSentences('見出し\n\n本文です。')).toHaveLength(2);
  });
});

describe('chunkSegments', () => {
  const sentence = 'これはテスト用の文章です。'; // 13 chars

  it('packs sentences up to the target and records offsets', () => {
    const text = sentence.repeat(200);
    const chunks = chunkSegments([{ text, start: 0, locator: { page: 1 } }], {
      target: 260,
      max: 400,
      overlap: 26,
    });
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(400);
      expect(text.slice(c.charStart, c.charEnd)).toBe(c.text);
      expect(c.locator).toEqual({ page: 1 });
    }
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
  });

  it('overlaps consecutive chunks', () => {
    const text = sentence.repeat(100);
    const [a, b] = chunkSegments([{ text, start: 0, locator: {} }], {
      target: 260,
      max: 400,
      overlap: 26,
    });
    expect(b.charStart).toBeLessThan(a.charEnd);
  });

  it('never crosses a segment boundary and offsets are global', () => {
    const one = sentence.repeat(3);
    const two = 'Second section text.';
    const chunks = chunkSegments([
      { text: one, start: 0, locator: { blockId: 'a' } },
      { text: two, start: one.length + 2, locator: { blockId: 'b' } },
    ]);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toMatchObject({
      text: two,
      charStart: one.length + 2,
      locator: { blockId: 'b' },
    });
  });

  it('hard-splits a single sentence longer than max', () => {
    const chunks = chunkSegments(
      [{ text: 'あ'.repeat(1000), start: 0, locator: {} }],
      {
        target: 300,
        max: 400,
        overlap: 0,
      }
    );
    expect(chunks.every((c) => c.text.length <= 400)).toBe(true);
    expect(chunks.map((c) => c.text).join('')).toBe('あ'.repeat(1000));
  });

  it('skips empty segments', () => {
    expect(chunkSegments([{ text: '  \n ', start: 0, locator: {} }])).toEqual(
      []
    );
  });
});

describe('contentHash', () => {
  it('is stable sha256 hex', () => {
    expect(contentHash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

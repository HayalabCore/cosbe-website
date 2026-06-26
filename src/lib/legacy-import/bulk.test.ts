import { describe, expect, it } from 'vitest';
import { parseBulkUrls } from './bulk';

describe('parseBulkUrls', () => {
  it('keeps valid legacy URLs in order and dedupes', () => {
    const text = [
      'https://www.jp.cosbe.inc/useful-info/a/',
      'https://www.jp.cosbe.inc/news/b/',
      'https://www.jp.cosbe.inc/useful-info/a/', // dup
    ].join('\n');
    const { valid, invalid } = parseBulkUrls(text);
    expect(valid).toEqual([
      'https://www.jp.cosbe.inc/useful-info/a/',
      'https://www.jp.cosbe.inc/news/b/',
    ]);
    expect(invalid).toEqual([]);
  });

  it('drops blank/whitespace-only lines', () => {
    const text = '\n  \nhttps://www.jp.cosbe.inc/news/b/\n\n';
    expect(parseBulkUrls(text).valid).toEqual([
      'https://www.jp.cosbe.inc/news/b/',
    ]);
  });

  it('flags invalid lines with a reason but keeps valid ones', () => {
    const text = [
      'https://example.com/foo/',
      'not a url',
      'https://www.jp.cosbe.inc/useful-info/a/',
    ].join('\n');
    const { valid, invalid } = parseBulkUrls(text);
    expect(valid).toEqual(['https://www.jp.cosbe.inc/useful-info/a/']);
    expect(invalid.map((i) => i.line)).toEqual([
      'https://example.com/foo/',
      'not a url',
    ]);
    expect(invalid[0].reason.length).toBeGreaterThan(0);
  });
});

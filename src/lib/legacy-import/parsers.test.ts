import { describe, expect, it } from 'vitest';
import { parseLegacyDate } from './date';
import { youtubeUrlFromText } from './shared';

describe('parseLegacyDate', () => {
  it('parses Japanese date text to ISO UTC midnight', () => {
    expect(parseLegacyDate('2024年8月31日')).toBe('2024-08-31T00:00:00.000Z');
  });
  it('returns null on unparseable text', () => {
    expect(parseLegacyDate('not a date')).toBeNull();
  });
});

describe('youtubeUrlFromText', () => {
  it.each([
    ['https://www.youtube.com/watch?v=ABC123', 'ABC123'],
    ['see https://youtu.be/XYZ789 now', 'XYZ789'],
    ['https://www.youtube.com/embed/QWE456', 'QWE456'],
  ])('normalizes %s', (input, id) => {
    expect(youtubeUrlFromText(input)).toBe(
      `https://www.youtube.com/watch?v=${id}`
    );
  });
  it('returns null when no youtube url present', () => {
    expect(youtubeUrlFromText('https://example.com/video')).toBeNull();
  });
});

import * as cheerio from 'cheerio';
import { extractTable } from './shared';

describe('extractTable', () => {
  it('uses thead for headers and tbody for rows', () => {
    const $ = cheerio.load(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
        '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    );
    const block = extractTable($, $('table')[0]);
    expect(block).toMatchObject({
      type: 'table',
      headers: ['A', 'B'],
      rows: [['1', '2']],
    });
  });

  it('falls back to first row as headers when no thead', () => {
    const $ = cheerio.load(
      '<table><tr><td>H1</td><td>H2</td></tr><tr><td>x</td><td>y</td></tr></table>'
    );
    const block = extractTable($, $('table')[0]);
    expect(block).toMatchObject({ headers: ['H1', 'H2'], rows: [['x', 'y']] });
  });

  it('returns null for an empty table', () => {
    const $ = cheerio.load('<table></table>');
    expect(extractTable($, $('table')[0])).toBeNull();
  });
});

import { findContentRoot, walkBlocks } from './shared';

describe('walkBlocks image handling', () => {
  it('extracts an image that only has srcset', () => {
    const $ = cheerio.load(
      '<div class="entry-content"><img srcset="https://cdn.example.com/a.jpg 1x"></div>'
    );
    const root = findContentRoot($);
    const blocks = walkBlocks($, root, 'https://www.jp.cosbe.inc/x/y/', []);
    const img = blocks.find((b) => b.type === 'image');
    expect(img).toBeDefined();
    expect(img && 'url' in img && img.url).toContain('a.jpg');
  });
});

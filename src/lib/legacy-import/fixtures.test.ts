import { describe, expect, it } from 'vitest';
import { fixturePathForUrl, normalizeForSnapshot } from './fixtures';

describe('fixturePathForUrl', () => {
  it('builds a category/slug path for an article URL', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/useful-info/llmo-01/')
    ).toEqual({
      category: 'useful-info',
      slug: 'llmo-01',
      relPath: 'useful-info/llmo-01.html',
    });
  });

  it('maps /news/ articles under notice', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/news/media-1/')?.relPath
    ).toBe('notice/media-1.html');
  });

  it('returns null for listing / non-article URLs', () => {
    expect(
      fixturePathForUrl('https://www.jp.cosbe.inc/category/case-studies/')
    ).toBeNull();
    expect(fixturePathForUrl('https://example.com/foo/')).toBeNull();
  });
});

describe('normalizeForSnapshot', () => {
  it('replaces every block id with a stable placeholder', () => {
    const out = normalizeForSnapshot({
      slug: 'x',
      blocks: [
        { id: 'abc123', type: 'heading' },
        { id: 'def456', type: 'paragraph' },
      ],
    });
    expect(out.blocks.map((b) => b.id)).toEqual(['<id>', '<id>']);
  });
});

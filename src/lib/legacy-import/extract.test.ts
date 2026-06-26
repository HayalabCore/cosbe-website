// src/lib/legacy-import/extract.test.ts
import { describe, expect, it } from 'vitest';
import { extractFromHtml } from '@/lib/legacy-import';

const USEFUL_INFO_HTML = `
<html><body>
  <article class="l-mainContent__inner">
    <h1 class="c-postTitle__ttl">AIで変わる経営</h1>
    <div class="post_content">
      <h2>はじめに</h2>
      <p>これは本文の段落です。</p>
      <ul><li>項目1</li><li>項目2</li></ul>
    </div>
  </article>
</body></html>`;

describe('extractFromHtml', () => {
  it('extracts title, slug and blocks from useful-info HTML without network', () => {
    const result = extractFromHtml(
      USEFUL_INFO_HTML,
      'https://www.jp.cosbe.inc/useful-info/sample-post/'
    );
    expect(result.category).toBe('useful-info');
    expect(result.slug).toBe('sample-post');
    expect(result.title).toBe('AIで変わる経営');
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.some((b) => b.type === 'heading')).toBe(true);
    expect('slugCollision' in result).toBe(false);
  });
});

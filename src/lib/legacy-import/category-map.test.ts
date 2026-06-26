import { describe, expect, it } from 'vitest';
import { parseLegacyUrl } from '@/lib/legacy-import';

describe('parseLegacyUrl category mapping', () => {
  it('maps /news/ to the notice category', () => {
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/news/media-1/').category
    ).toBe('notice');
  });

  it('still maps the legacy segments', () => {
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/case-studies/kando/').category
    ).toBe('case-study');
    expect(
      parseLegacyUrl('https://www.jp.cosbe.inc/useful-movie/useful-movie-001/')
        .category
    ).toBe('video');
  });
});

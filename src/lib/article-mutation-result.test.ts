import { describe, expect, it } from 'vitest';
import { isArticleMutationFailure } from './article-mutation-result';

describe('isArticleMutationFailure', () => {
  it('narrows a failed mutation result', () => {
    expect(isArticleMutationFailure({ ok: false, error: 'SLUG_CONFLICT' })).toBe(
      true
    );
    expect(isArticleMutationFailure({ ok: true, id: 'x', slug: 's' })).toBe(
      false
    );
  });
});

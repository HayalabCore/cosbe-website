import { describe, expect, it } from 'vitest';
import {
  MAX_SELECTED_SOURCES,
  sameSelection,
  selectionInputSchema,
  type Selection,
} from './piece-types';

const selection = (over: Partial<Selection> = {}): Selection => ({
  sourceIds: ['b', 'a'],
  chapters: { a: [2, 1], b: [] },
  ...over,
});

describe('sameSelection', () => {
  it('ignores source order and chapter key order', () => {
    expect(
      sameSelection(selection(), {
        sourceIds: ['a', 'b'],
        chapters: { b: [], a: [1, 2] },
      })
    ).toBe(true);
  });

  it('treats a missing chapter list as empty', () => {
    expect(
      sameSelection(selection({ chapters: { a: [1] } }), {
        sourceIds: ['b', 'a'],
        chapters: { a: [1], b: [] },
      })
    ).toBe(true);
  });

  it('rejects more chapter maps than the source cap', () => {
    const chapters = Object.fromEntries(
      Array.from({ length: MAX_SELECTED_SOURCES + 1 }, (_, i) => [
        `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        [1],
      ])
    );
    expect(
      selectionInputSchema.safeParse({ sourceIds: [], chapters }).success
    ).toBe(false);
  });

  it('notices a real source or chapter change', () => {
    expect(sameSelection(selection(), selection({ sourceIds: ['a'] }))).toBe(
      false
    );
    expect(
      sameSelection(selection(), selection({ chapters: { a: [1], b: [] } }))
    ).toBe(false);
  });
});

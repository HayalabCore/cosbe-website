import { describe, expect, it } from 'vitest';
import { mergeRrf } from './rrf';

describe('mergeRrf', () => {
  it('ranks items found by both lists first', () => {
    const merged = mergeRrf([
      ['a', 'b', 'c'],
      ['c', 'd'],
    ]);
    expect(merged[0].id).toBe('c');
    expect(merged.map((m) => m.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('uses 1/(k + rank)', () => {
    const [top] = mergeRrf([['a']], 60);
    expect(top.score).toBeCloseTo(1 / 61);
  });
});

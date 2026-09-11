import { describe, expect, it } from 'vitest';
import { prismaUniqueConflict } from '@/test/prisma-error';
import { isSlugUniqueConflict } from './prisma-errors';

describe('isSlugUniqueConflict', () => {
  it('is true when P2002 target lists slug', () => {
    expect(isSlugUniqueConflict(prismaUniqueConflict(['slug']))).toBe(true);
  });

  it('is true when P2002 target is a constraint name containing slug', () => {
    expect(isSlugUniqueConflict(prismaUniqueConflict('articles_slug_key'))).toBe(
      true
    );
  });

  it('is false for an author unique conflict', () => {
    expect(
      isSlugUniqueConflict(prismaUniqueConflict(['name', 'designation']))
    ).toBe(false);
  });

  it('is false for a plain object or generic error', () => {
    expect(isSlugUniqueConflict({ code: 'P2002' })).toBe(false);
    expect(isSlugUniqueConflict(new Error('nope'))).toBe(false);
  });
});

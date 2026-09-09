import { describe, expect, it } from 'vitest';
import { prisma } from './prisma';

describe('db smoke', () => {
  it('selects 1', async () => {
    const rows = await prisma.$queryRaw<Array<{ n: number }>>`SELECT 1 as n`;
    expect(rows[0]?.n).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('studio database extensions', () => {
  it('has vector and pgroonga installed', async () => {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgroonga')`;
    expect(rows.map((r) => r.extname).sort()).toEqual(['pgroonga', 'vector']);
  });
});

import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

const TABLES = [
  'studio_sources',
  'studio_source_chunks',
  'studio_projects',
  'studio_project_sources',
];

describe('studio source tables', () => {
  it('enable RLS', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY(${TABLES})`;
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it('have the HNSW and PGroonga retrieval indexes', async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'studio_source_chunks'`;
    const names = rows.map((r) => r.indexname);
    expect(names).toContain('studio_source_chunks_embedding_hnsw_idx');
    expect(names).toContain('studio_source_chunks_text_pgroonga_idx');
  });

  it('reject unknown statuses', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO studio_sources (kind, status, title) VALUES ('text', 'bogus', 'x')`
    ).rejects.toThrow();
  });
});

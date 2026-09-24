import { describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('studio piece tables', () => {
  it('enable RLS', async () => {
    const rows = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
      SELECT relrowsecurity FROM pg_class
      WHERE relname IN ('studio_templates', 'studio_pieces', 'studio_piece_snapshots')`;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it('seed exactly one default template', async () => {
    expect(
      await prisma.studioTemplate.count({ where: { isDefault: true } })
    ).toBe(1);
  });

  it('reject unknown stages', async () => {
    const project = await prisma.studioProject.create({
      data: { name: 'schema-test' },
    });
    try {
      await expect(
        prisma.$executeRaw`INSERT INTO studio_pieces (project_id, stage) VALUES (${project.id}::uuid, 'bogus')`
      ).rejects.toThrow();
    } finally {
      await prisma.studioProject.delete({ where: { id: project.id } });
    }
  });
});

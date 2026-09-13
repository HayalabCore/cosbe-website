import { describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import { DEFAULT_ROLE_PERMISSIONS, SUPER_ADMIN_ROLE_KEY } from './permissions';

describe('add_user_management migration seed', () => {
  it('creates super-admin as the only system role, with no permission rows', async () => {
    const system = await prisma.role.findMany({
      where: { isSystem: true },
      include: { permissions: true },
    });
    expect(system.map((r) => r.key)).toEqual([SUPER_ADMIN_ROLE_KEY]);
    expect(system[0].permissions).toEqual([]);
  });

  it.each(['admin', 'developer', 'marketing'] as const)(
    '%s permissions match DEFAULT_ROLE_PERMISSIONS',
    async (key) => {
      const role = await prisma.role.findUniqueOrThrow({
        where: { key },
        include: { permissions: true },
      });
      expect(role.permissions.map((p) => p.permission).sort()).toEqual(
        [...DEFAULT_ROLE_PERMISSIONS[key]].sort()
      );
    }
  );

  it('enables RLS on the access tables', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('admin_users', 'roles', 'role_permissions', 'user_roles')`;
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });
});

import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import {
  createAdminUserRecord,
  deleteAdminUserRecord,
  findAdminUserWithRoles,
  isSuperAdminUser,
  provisionAdminUser,
  rolesOf,
  setAdminUserDisabled,
  setAdminUserRoles,
  setMustChangePassword,
} from './admin-users-repository';

const emailPrefix = 'db-test-user-';

afterEach(async () => {
  await prisma.adminUser.deleteMany({
    where: { email: { startsWith: emailPrefix } },
  });
});

async function roleId(key: string) {
  return (await prisma.role.findUniqueOrThrow({ where: { key } })).id;
}

describe('admin-users-repository db', () => {
  it('provisions a user with no roles and does not overwrite on repeat', async () => {
    const id = randomUUID();
    const first = await provisionAdminUser(id, `${emailPrefix}a@test.local`);
    expect(first.roles).toEqual([]);
    await setAdminUserDisabled(id, true);
    const again = await provisionAdminUser(id, `${emailPrefix}a@test.local`);
    expect(again.disabled).toBe(true);
  });

  it('creates a user with roles and mustChangePassword', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}b@test.local`,
      displayName: 'B',
      createdBy: 'creator@test.local',
      roleIds: [await roleId('marketing')],
    });
    const user = await findAdminUserWithRoles(id);
    expect(user?.mustChangePassword).toBe(true);
    expect(rolesOf(user!).map((r) => r.key)).toEqual(['marketing']);
    expect(rolesOf(user!)[0].permissions).toContain('articles.publish');
    expect(isSuperAdminUser(user!)).toBe(false);
  });

  it('replaces the role set', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}c@test.local`,
      displayName: null,
      createdBy: 'x',
      roleIds: [await roleId('marketing')],
    });
    await setAdminUserRoles(
      id,
      [await roleId('developer'), await roleId('super-admin')],
      'actor@test.local'
    );
    const user = await findAdminUserWithRoles(id);
    expect(
      rolesOf(user!)
        .map((r) => r.key)
        .sort()
    ).toEqual(['developer', 'super-admin']);
    expect(isSuperAdminUser(user!)).toBe(true);
  });

  it('toggles mustChangePassword and deletes with cascade', async () => {
    const id = randomUUID();
    await createAdminUserRecord({
      id,
      email: `${emailPrefix}d@test.local`,
      displayName: null,
      createdBy: 'x',
      roleIds: [await roleId('marketing')],
    });
    await setMustChangePassword(id, false);
    expect((await findAdminUserWithRoles(id))?.mustChangePassword).toBe(false);
    await deleteAdminUserRecord(id);
    expect(await findAdminUserWithRoles(id)).toBeNull();
    expect(await prisma.userRole.count({ where: { userId: id } })).toBe(0);
  });
});

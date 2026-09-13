import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import {
  createRoleRecord,
  deleteRoleRecord,
  getRoleById,
  getRolesByIds,
  listRoles,
  roleKeyExists,
  updateRoleRecord,
} from './roles-repository';
import { createAdminUserRecord } from './admin-users-repository';

afterEach(async () => {
  await prisma.adminUser.deleteMany({
    where: { email: { startsWith: 'db-test-role-' } },
  });
  await prisma.role.deleteMany({ where: { key: { startsWith: 'db-test-' } } });
});

describe('roles-repository db', () => {
  it('lists the system role first, with user counts', async () => {
    const roles = await listRoles();
    expect(roles[0].key).toBe('super-admin');
    expect(roles.every((r) => typeof r.userCount === 'number')).toBe(true);
  });

  it('creates, updates and reads a role', async () => {
    const id = await createRoleRecord({
      key: 'db-test-editor',
      name: 'Editor',
      description: null,
      permissions: ['articles.edit'],
    });
    expect(await roleKeyExists('db-test-editor')).toBe(true);
    await updateRoleRecord(id, {
      name: 'Editor 2',
      description: 'desc',
      permissions: ['articles.edit', 'media.upload'],
    });
    const role = await getRoleById(id);
    expect(role?.name).toBe('Editor 2');
    expect(role?.permissions.sort()).toEqual(['articles.edit', 'media.upload']);
    expect((await getRolesByIds([id])).map((r) => r.id)).toEqual([id]);
  });

  it('deleting a role removes it from users', async () => {
    const id = await createRoleRecord({
      key: 'db-test-temp',
      name: 'Temp',
      description: null,
      permissions: [],
    });
    const userId = randomUUID();
    await createAdminUserRecord({
      id: userId,
      email: 'db-test-role-a@test.local',
      displayName: null,
      createdBy: 'x',
      roleIds: [id],
    });
    expect((await getRoleById(id))?.userCount).toBe(1);
    await deleteRoleRecord(id);
    expect(await prisma.userRole.count({ where: { userId } })).toBe(0);
  });
});

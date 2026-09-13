import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import type { AdminUserRow, RoleRow } from '@/lib/access-types';
import {
  createdRoleRow,
  createdUserRow,
  userWithRoles,
} from '@/lib/access-optimistic';

const roles: RoleRow[] = [
  {
    id: 'r-super',
    key: 'super-admin',
    name: 'Super-admin',
    description: null,
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  {
    id: 'r-marketing',
    key: 'marketing',
    name: 'Marketing',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    userCount: 0,
  },
];

const user: AdminUserRow = {
  id: 'u1',
  email: 'u@test.local',
  displayName: null,
  disabled: false,
  mustChangePassword: false,
  isSuperAdmin: false,
  roleIds: [],
  permissions: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSignInAt: null,
};

describe('access-optimistic', () => {
  it('applies role permissions and super-admin', () => {
    const marketing = userWithRoles(user, ['r-marketing'], roles);
    expect(marketing.roleIds).toEqual(['r-marketing']);
    expect(marketing.permissions).toEqual(
      expect.arrayContaining(DEFAULT_ROLE_PERMISSIONS.marketing)
    );
    expect(marketing.isSuperAdmin).toBe(false);

    const boss = userWithRoles(user, ['r-super'], roles);
    expect(boss.isSuperAdmin).toBe(true);
    expect(boss.permissions).toEqual([...ALL_PERMISSIONS]);
  });

  it('builds a created user and role row', () => {
    const created = createdUserRow({
      id: 'new',
      email: 'new@test.local',
      displayName: '  Ada  ',
      roleIds: ['r-marketing'],
      roles,
    });
    expect(created.displayName).toBe('Ada');
    expect(created.mustChangePassword).toBe(true);
    expect(created.roleIds).toEqual(['r-marketing']);

    expect(
      createdRoleRow({
        id: 'r-new',
        key: 'editor',
        name: 'Editor',
        description: '  writes  ',
        permissions: ['articles.edit'],
      })
    ).toMatchObject({
      id: 'r-new',
      key: 'editor',
      description: 'writes',
      userCount: 0,
      isSystem: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  canAssignRole,
  canDeleteRole,
  canEditRole,
  canModifyUser,
  holdsAll,
  type Actor,
  type RoleLike,
} from './authz-rules';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './permissions';

const superAdmin: Actor = {
  userId: 'sa',
  permissions: new Set(ALL_PERMISSIONS),
  isSuperAdmin: true,
};
const admin: Actor = {
  userId: 'ad',
  permissions: new Set(DEFAULT_ROLE_PERMISSIONS.admin),
  isSuperAdmin: false,
};

const superRole: RoleLike = {
  key: 'super-admin',
  isSystem: true,
  permissions: [],
};
const adminRole: RoleLike = {
  key: 'admin',
  isSystem: false,
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
};
const powerRole: RoleLike = {
  key: 'power',
  isSystem: false,
  permissions: ['users.delete'],
};

describe('holdsAll', () => {
  it('ignores unknown permission strings', () => {
    expect(holdsAll(admin, ['media.upload', 'legacy.gone'])).toBe(true);
  });
  it('fails when one permission is missing', () => {
    expect(holdsAll(admin, ['media.upload', 'users.delete'])).toBe(false);
  });
});

describe('canAssignRole', () => {
  it('only super-admins can assign the super-admin role', () => {
    expect(canAssignRole(superAdmin, superRole)).toBe(true);
    expect(canAssignRole(admin, superRole)).toBe(false);
  });
  it('admin can assign roles within their permissions', () => {
    expect(canAssignRole(admin, adminRole)).toBe(true);
  });
  it('admin cannot assign a role with a permission they lack', () => {
    expect(canAssignRole(admin, powerRole)).toBe(false);
  });
});

describe('canModifyUser', () => {
  it('nobody can modify themselves', () => {
    expect(
      canModifyUser(superAdmin, {
        id: 'sa',
        isSuperAdmin: true,
        permissions: ALL_PERMISSIONS,
      })
    ).toBe(false);
    expect(
      canModifyUser(admin, {
        id: 'ad',
        isSuperAdmin: false,
        permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      })
    ).toBe(false);
  });
  it('only super-admins can modify a super-admin', () => {
    expect(
      canModifyUser(admin, {
        id: 'x',
        isSuperAdmin: true,
        permissions: ALL_PERMISSIONS,
      })
    ).toBe(false);
    expect(
      canModifyUser(superAdmin, {
        id: 'x',
        isSuperAdmin: true,
        permissions: ALL_PERMISSIONS,
      })
    ).toBe(true);
  });
  it('admin can modify a regular user they outrank', () => {
    expect(
      canModifyUser(admin, {
        id: 'x',
        isSuperAdmin: false,
        permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
      })
    ).toBe(true);
  });
  it('cannot modify a user who holds a permission the actor lacks', () => {
    const limited: Actor = {
      userId: 'hr',
      permissions: new Set(['users.view', 'users.create', 'users.disable']),
      isSuperAdmin: false,
    };
    expect(
      canModifyUser(limited, {
        id: 'x',
        isSuperAdmin: false,
        permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      })
    ).toBe(false);
    expect(
      canModifyUser(admin, {
        id: 'x',
        isSuperAdmin: false,
        permissions: ['users.delete'],
      })
    ).toBe(false);
  });
});

describe('canEditRole', () => {
  it('system roles are never editable', () => {
    expect(canEditRole(superAdmin, superRole, [])).toBe(false);
  });
  it('creating a role requires holding the new permissions', () => {
    expect(canEditRole(admin, null, ['media.upload'])).toBe(true);
    expect(canEditRole(admin, null, ['users.delete'])).toBe(false);
  });
  it('editing requires holding both current and next permissions', () => {
    // admin cannot strip users.delete from a more powerful role
    expect(canEditRole(admin, powerRole, [])).toBe(false);
    expect(canEditRole(superAdmin, powerRole, [])).toBe(true);
  });
});

describe('canDeleteRole', () => {
  it('system roles cannot be deleted', () => {
    expect(canDeleteRole(superAdmin, superRole)).toBe(false);
  });
  it('requires holding all of the role permissions', () => {
    expect(canDeleteRole(admin, powerRole)).toBe(false);
    expect(canDeleteRole(admin, adminRole)).toBe(true);
  });
});

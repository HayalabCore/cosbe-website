import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SUPER_ADMIN_ROLE_KEY,
  isPermission,
  permissionMessageKey,
  resolvePermissions,
} from './permissions';

describe('permission catalog', () => {
  it('has the 16 spec permissions', () => {
    expect(ALL_PERMISSIONS).toHaveLength(16);
    expect(ALL_PERMISSIONS).toContain('users.delete');
    expect(ALL_PERMISSIONS).toContain('translations.history.delete');
  });

  it('isPermission rejects unknown strings', () => {
    expect(isPermission('articles.publish')).toBe(true);
    expect(isPermission('articles.fly')).toBe(false);
  });

  it('permissionMessageKey replaces dots', () => {
    expect(permissionMessageKey('translations.history.delete')).toBe(
      'translations_history_delete'
    );
    expect(permissionMessageKey('users.assign-roles')).toBe(
      'users_assign-roles'
    );
  });

  it('admin default role has everything except users.delete', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain('users.delete');
    expect(DEFAULT_ROLE_PERMISSIONS.admin).toHaveLength(
      ALL_PERMISSIONS.length - 1
    );
  });

  it('developer has no access-management permissions', () => {
    expect(
      DEFAULT_ROLE_PERMISSIONS.developer.some(
        (p) => p.startsWith('users.') || p.startsWith('roles.')
      )
    ).toBe(false);
  });
});

describe('resolvePermissions', () => {
  it('returns an empty set for no roles', () => {
    const r = resolvePermissions([]);
    expect(r.permissions.size).toBe(0);
    expect(r.isSuperAdmin).toBe(false);
  });

  it('unions multiple roles and ignores unknown strings', () => {
    const r = resolvePermissions([
      { key: 'a', permissions: ['media.upload', 'gone.permission'] },
      { key: 'b', permissions: ['media.delete', 'media.upload'] },
    ]);
    expect([...r.permissions].sort()).toEqual(['media.delete', 'media.upload']);
  });

  it('super-admin gets the whole catalog', () => {
    const r = resolvePermissions([
      { key: SUPER_ADMIN_ROLE_KEY, permissions: [] },
    ]);
    expect(r.isSuperAdmin).toBe(true);
    expect(r.permissions.size).toBe(ALL_PERMISSIONS.length);
  });
});

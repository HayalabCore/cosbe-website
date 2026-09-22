import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin-users-repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin-users-repository')>()),
  findAdminUserWithRoles: vi.fn(),
}));

import { findAdminUserWithRoles } from '@/lib/admin-users-repository';
import { actorHasPermission } from './authz';

function user(
  roleKey: string,
  permissions: string[],
  {
    disabled = false,
    mustChangePassword = false,
  }: { disabled?: boolean; mustChangePassword?: boolean } = {}
) {
  return {
    id: 'u1',
    disabled,
    mustChangePassword,
    roles: [
      {
        role: {
          id: 'r1',
          key: roleKey,
          isSystem: roleKey === 'super-admin',
          permissions: permissions.map((permission) => ({ permission })),
        },
      },
    ],
  } as never;
}

describe('actorHasPermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is false without a user id', async () => {
    expect(await actorHasPermission(null, 'studio.use')).toBe(false);
    expect(findAdminUserWithRoles).not.toHaveBeenCalled();
  });

  it('is false for an unknown user', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it('is false for a disabled user who holds the permission', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['studio.use'], { disabled: true })
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it.each(['marketing', 'super-admin'])(
    'rejects %s while a forced password change is pending',
    async (role) => {
      vi.mocked(findAdminUserWithRoles).mockResolvedValue(
        user(role, ['studio.use'], { mustChangePassword: true })
      );
      expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
    }
  );

  it('is true when a role grants the permission', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['studio.use'])
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(true);
  });

  it('is false when no role grants it', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('marketing', ['articles.edit'])
    );
    expect(await actorHasPermission('u1', 'studio.use')).toBe(false);
  });

  it('is true for super-admin', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      user('super-admin', [])
    );
    expect(await actorHasPermission('u1', 'studio.sources.delete')).toBe(true);
  });
});

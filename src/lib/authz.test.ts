import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/admin-users-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/admin-users-repository')>();
  return {
    ...actual,
    findAdminUserWithRoles: vi.fn(),
    provisionAdminUser: vi.fn(),
    adoptAdminUserId: vi.fn(),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  authUserExists: vi.fn(),
}));

import {
  getCurrentAdmin,
  hasPermission,
  requireActiveSession,
  requireAnyPermission,
  requirePermission,
} from './authz';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  adoptAdminUserId,
  EmailOwnedByOtherRowError,
  findAdminUserWithRoles,
  provisionAdminUser,
} from '@/lib/admin-users-repository';
import { authUserExists } from '@/lib/supabase/admin';

function session(user: { id: string; email: string } | null) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

function adminRow(
  overrides: Partial<{
    email: string;
    disabled: boolean;
    mustChangePassword: boolean;
    roles: { key: string; permissions: string[] }[];
  }> = {}
) {
  const roles = overrides.roles ?? [];
  return {
    id: 'u1',
    email: overrides.email ?? 'u1@test.local',
    displayName: null,
    disabled: overrides.disabled ?? false,
    mustChangePassword: overrides.mustChangePassword ?? false,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: roles.map((r, i) => ({
      userId: 'u1',
      roleId: `r${i}`,
      assignedBy: null,
      assignedAt: new Date(),
      role: {
        id: `r${i}`,
        key: r.key,
        name: r.key,
        description: null,
        isSystem: r.key === 'super-admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: r.permissions.map((permission) => ({
          roleId: `r${i}`,
          permission,
        })),
      },
    })),
  };
}

describe('getCurrentAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is unauthenticated without a session', async () => {
    session(null);
    expect((await getCurrentAdmin()).status).toBe('unauthenticated');
  });

  it('auto-provisions a missing row with no permissions', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    vi.mocked(provisionAdminUser).mockResolvedValue(adminRow() as never);
    const result = await getCurrentAdmin();
    expect(provisionAdminUser).toHaveBeenCalledWith('u1', 'u1@test.local');
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.actor.permissions.size).toBe(0);
    }
  });

  it('syncs email when the Auth address has changed', async () => {
    session({ id: 'u1', email: 'new@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ email: 'old@test.local' }) as never
    );
    vi.mocked(provisionAdminUser).mockResolvedValue(
      adminRow({ email: 'new@test.local' }) as never
    );
    await getCurrentAdmin();
    expect(provisionAdminUser).toHaveBeenCalledWith('u1', 'new@test.local');
  });

  it('adopts a stale email row when the old Auth user is gone', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    vi.mocked(provisionAdminUser).mockRejectedValue(
      new EmailOwnedByOtherRowError('old-id')
    );
    vi.mocked(authUserExists).mockResolvedValue(false);
    vi.mocked(adoptAdminUserId).mockResolvedValue(adminRow() as never);
    const result = await getCurrentAdmin();
    expect(adoptAdminUserId).toHaveBeenCalledWith(
      'old-id',
      'u1',
      'u1@test.local',
      { disabled: false }
    );
    expect(result.status).toBe('active');
  });

  it('does not adopt during email sync when the new address is taken', async () => {
    session({ id: 'u1', email: 'taken@test.local' });
    const existing = adminRow({ email: 'old@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(existing as never);
    vi.mocked(provisionAdminUser).mockRejectedValue(
      new EmailOwnedByOtherRowError('other-id')
    );
    const result = await getCurrentAdmin();
    expect(adoptAdminUserId).not.toHaveBeenCalled();
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.admin.email).toBe('old@test.local');
    }
  });

  it('does not adopt when the email owner still exists in Auth', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(null);
    vi.mocked(provisionAdminUser).mockRejectedValue(
      new EmailOwnedByOtherRowError('old-id')
    );
    vi.mocked(authUserExists).mockResolvedValue(true);
    await expect(getCurrentAdmin()).rejects.toBeInstanceOf(
      EmailOwnedByOtherRowError
    );
    expect(adoptAdminUserId).not.toHaveBeenCalled();
  });

  it('reports disabled before must-change-password', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ disabled: true, mustChangePassword: true }) as never
    );
    expect((await getCurrentAdmin()).status).toBe('disabled');
  });

  it('reports must-change-password', async () => {
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ mustChangePassword: true }) as never
    );
    expect((await getCurrentAdmin()).status).toBe('must-change-password');
  });
});

describe('requirePermission / requireAnyPermission / hasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session({ id: 'u1', email: 'u1@test.local' });
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({
        roles: [{ key: 'marketing', permissions: ['articles.edit'] }],
      }) as never
    );
  });

  it('allows a held permission', async () => {
    const ctx = await requirePermission('articles.edit');
    expect(ctx.user.id).toBe('u1');
  });

  it('throws Forbidden when any permission is missing', async () => {
    await expect(
      requirePermission('articles.edit', 'articles.publish')
    ).rejects.toThrow('Forbidden');
  });

  it('requireAnyPermission passes with one match', async () => {
    await expect(
      requireAnyPermission('media.upload', 'articles.edit')
    ).resolves.toBeTruthy();
    await expect(requireAnyPermission('media.upload')).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws Unauthorized without a session', async () => {
    session(null);
    await expect(requirePermission('articles.edit')).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('throws Forbidden while a password change is pending', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({
        mustChangePassword: true,
        roles: [{ key: 'marketing', permissions: ['articles.edit'] }],
      }) as never
    );
    await expect(requirePermission('articles.edit')).rejects.toThrow(
      'Forbidden'
    );
    await expect(requireActiveSession()).resolves.toMatchObject({
      status: 'must-change-password',
    });
  });

  it('requireActiveSession rejects disabled users', async () => {
    vi.mocked(findAdminUserWithRoles).mockResolvedValue(
      adminRow({ disabled: true }) as never
    );
    await expect(requireActiveSession()).rejects.toThrow('Forbidden');
  });

  it('hasPermission never throws', async () => {
    expect(await hasPermission('articles.edit')).toBe(true);
    expect(await hasPermission('users.delete')).toBe(false);
    session(null);
    expect(await hasPermission('articles.edit')).toBe(false);
  });
});

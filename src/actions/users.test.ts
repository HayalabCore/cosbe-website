import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/admin-users-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/admin-users-repository')>();
  return {
    ...actual,
    findAdminUserWithRoles: vi.fn(),
    findAdminUserByEmail: vi.fn(),
    listAdminUsers: vi.fn(),
    createAdminUserRecord: vi.fn(),
    adoptAdminUserId: vi.fn(),
    setAdminUserProfile: vi.fn(),
    setAdminUserRoles: vi.fn(),
    setAdminUserDisabled: vi.fn(),
    setMustChangePassword: vi.fn(),
    deleteAdminUserRecord: vi.fn(),
  };
});

vi.mock('@/lib/roles-repository', () => ({ getRolesByIds: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  listAuthUsers: vi.fn(),
  createAuthUser: vi.fn(),
  setAuthUserPassword: vi.fn(),
  setAuthUserBanned: vi.fn(),
  deleteAuthUser: vi.fn(),
  authUserExists: vi.fn(),
  revokeAuthUserSessions: vi.fn(),
}));

import {
  createUserAction,
  deleteUserAction,
  disableUserAction,
  enableUserAction,
  listUsersAction,
  resetPasswordAction,
  setUserRolesAction,
} from './users';
import * as usersRepo from '@/lib/admin-users-repository';
import { getRolesByIds } from '@/lib/roles-repository';
import * as authAdmin from '@/lib/supabase/admin';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import { prismaUniqueConflict } from '@/test/prisma-error';

const TARGET_ID = '3f0b7a52-8a8e-4c1e-9f5e-1f2d3c4b5a69';
const ADMIN_ROLE = '6d2c1e4a-3b5f-4a7e-8c9d-0e1f2a3b4c5d';
const SUPER_ROLE = '7e3d2f5b-4c6a-4b8f-9d0e-1f2a3b4c5d6e';
const POWER_ROLE = '8f4e3a6c-5d7b-4c9a-8e1f-2a3b4c5d6e7f';

const roles = {
  [ADMIN_ROLE]: {
    id: ADMIN_ROLE,
    key: 'admin',
    name: 'Admin',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    userCount: 0,
  },
  [SUPER_ROLE]: {
    id: SUPER_ROLE,
    key: 'super-admin',
    name: 'Super-admin',
    description: null,
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  [POWER_ROLE]: {
    id: POWER_ROLE,
    key: 'power',
    name: 'Power',
    description: null,
    isSystem: false,
    permissions: ['users.delete'],
    userCount: 0,
  },
};

function target({
  id = TARGET_ID,
  roleIds = [] as string[],
  disabled = false,
} = {}) {
  return {
    id,
    email: 'target@test.local',
    displayName: null,
    disabled,
    mustChangePassword: false,
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    roles: roleIds.map((roleId) => {
      const r = roles[roleId as keyof typeof roles];
      return {
        userId: id,
        roleId,
        assignedBy: null,
        assignedAt: new Date(),
        role: {
          id: r.id,
          key: r.key,
          name: r.name,
          description: null,
          isSystem: r.isSystem,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions: r.permissions.map((permission) => ({
            roleId,
            permission,
          })),
        },
      };
    }),
  };
}

const ADMIN_PERMS = DEFAULT_ROLE_PERMISSIONS.admin;

beforeEach(() => {
  vi.clearAllMocks();
  authed(ADMIN_PERMS);
  vi.mocked(getRolesByIds).mockImplementation(async (ids) =>
    ids.map((id) => roles[id as keyof typeof roles]).filter(Boolean)
  );
  vi.mocked(authAdmin.revokeAuthUserSessions).mockResolvedValue(true);
  vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(true);
});

describe('listUsersAction', () => {
  it('maps rows and last sign-in', async () => {
    vi.mocked(usersRepo.listAdminUsers).mockResolvedValue([
      target({ roleIds: [SUPER_ROLE] }),
    ] as never);
    vi.mocked(authAdmin.listAuthUsers).mockResolvedValue([
      {
        id: TARGET_ID,
        email: 'target@test.local',
        lastSignInAt: '2026-02-01T00:00:00Z',
        banned: false,
      },
    ]);
    const rows = await listUsersAction();
    expect(rows).toEqual([
      {
        id: TARGET_ID,
        email: 'target@test.local',
        displayName: null,
        disabled: false,
        mustChangePassword: false,
        isSuperAdmin: true,
        roleIds: [SUPER_ROLE],
        permissions: ALL_PERMISSIONS,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastSignInAt: '2026-02-01T00:00:00Z',
      },
    ]);
  });

  it('still lists users when the auth API fails', async () => {
    vi.mocked(usersRepo.listAdminUsers).mockResolvedValue([target()] as never);
    vi.mocked(authAdmin.listAuthUsers).mockRejectedValue(new Error('no key'));
    const rows = await listUsersAction();
    expect(rows[0].lastSignInAt).toBeNull();
  });

  it('throws without users.view', async () => {
    authed(['dashboard.view']);
    await expect(listUsersAction()).rejects.toThrow('Forbidden');
  });
});

describe('createUserAction', () => {
  const input = {
    email: 'New@Test.local',
    displayName: 'New',
    password: 'temporary-pass-123',
    roleIds: [ADMIN_ROLE],
  };

  it('creates the auth user then the admin row', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    const res = await createUserAction(input);
    expect(res).toEqual({
      ok: true,
      data: { id: TARGET_ID, email: 'new@test.local' },
    });
    expect(authAdmin.createAuthUser).toHaveBeenCalledWith(
      'new@test.local',
      'temporary-pass-123'
    );
    expect(usersRepo.createAdminUserRecord).toHaveBeenCalledWith({
      id: TARGET_ID,
      email: 'new@test.local',
      displayName: 'New',
      createdBy: TEST_USER.email,
      roleIds: [ADMIN_ROLE],
    });
  });

  it('deletes the auth user when the DB write fails', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    vi.mocked(usersRepo.createAdminUserRecord).mockRejectedValue(
      new Error('db')
    );
    vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(true);
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'FAILED',
    });
    expect(authAdmin.deleteAuthUser).toHaveBeenCalledWith(TARGET_ID);
  });

  it('returns AUTH_ORPHAN when rollback of a failed create also fails', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    vi.mocked(usersRepo.createAdminUserRecord).mockRejectedValue(
      new Error('db')
    );
    vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(false);
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'AUTH_ORPHAN',
    });
  });

  it('maps a live email owner to EMAIL_EXISTS', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    vi.mocked(usersRepo.createAdminUserRecord).mockRejectedValue(
      prismaUniqueConflict(['email'])
    );
    vi.mocked(usersRepo.findAdminUserByEmail).mockResolvedValue(
      target({ id: 'old-id' }) as never
    );
    vi.mocked(authAdmin.authUserExists).mockResolvedValue(true);
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'EMAIL_EXISTS',
    });
    expect(authAdmin.deleteAuthUser).toHaveBeenCalledWith(TARGET_ID);
    expect(usersRepo.adoptAdminUserId).not.toHaveBeenCalled();
  });

  it('adopts a stale email row when the old Auth user is gone', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: true,
      id: TARGET_ID,
    });
    vi.mocked(usersRepo.createAdminUserRecord).mockRejectedValue(
      prismaUniqueConflict(['email'])
    );
    vi.mocked(usersRepo.findAdminUserByEmail).mockResolvedValue(
      target({ id: 'old-id' }) as never
    );
    vi.mocked(authAdmin.authUserExists).mockResolvedValue(false);
    expect(await createUserAction(input)).toEqual({
      ok: true,
      data: { id: TARGET_ID, email: 'new@test.local' },
    });
    expect(usersRepo.adoptAdminUserId).toHaveBeenCalledWith(
      'old-id',
      TARGET_ID,
      'new@test.local',
      {
        disabled: false,
        displayName: 'New',
        createdBy: TEST_USER.email,
        roleIds: [ADMIN_ROLE],
        mustChangePassword: true,
      }
    );
    expect(usersRepo.setAdminUserRoles).not.toHaveBeenCalled();
  });

  it('passes through EMAIL_EXISTS', async () => {
    vi.mocked(authAdmin.createAuthUser).mockResolvedValue({
      ok: false,
      error: 'EMAIL_EXISTS',
    });
    expect(await createUserAction(input)).toEqual({
      ok: false,
      error: 'EMAIL_EXISTS',
    });
  });

  it('refuses roles the actor cannot assign, before touching Supabase', async () => {
    expect(await createUserAction({ ...input, roleIds: [SUPER_ROLE] })).toEqual(
      {
        ok: false,
        error: 'FORBIDDEN',
      }
    );
    expect(await createUserAction({ ...input, roleIds: [POWER_ROLE] })).toEqual(
      {
        ok: false,
        error: 'FORBIDDEN',
      }
    );
    expect(authAdmin.createAuthUser).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    expect(await createUserAction({ ...input, password: 'short' })).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });

  it('throws without users.create', async () => {
    authed(['users.view']);
    await expect(createUserAction(input)).rejects.toThrow('Forbidden');
  });
});

describe('guardrails on existing users', () => {
  it('nobody can modify their own account', async () => {
    // Inputs are validated as UUIDs, so point the actor at the target's UUID.
    const ctx = authed(ADMIN_PERMS);
    ctx.actor.userId = TARGET_ID;
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(await disableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(usersRepo.setAdminUserDisabled).not.toHaveBeenCalled();
  });

  it('admins cannot modify a super-admin', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ roleIds: [SUPER_ROLE] }) as never
    );
    expect(
      await resetPasswordAction({
        userId: TARGET_ID,
        password: 'another-long-pass',
      })
    ).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });

  it('cannot reset an Admin password without holding Admin permissions', async () => {
    authed(['users.view', 'users.create', 'users.disable']);
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ roleIds: [ADMIN_ROLE] }) as never
    );
    expect(
      await resetPasswordAction({
        userId: TARGET_ID,
        password: 'another-long-pass',
      })
    ).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(authAdmin.setAuthUserPassword).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND for a missing user', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(null);
    expect(await enableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });
});

describe('setUserRolesAction', () => {
  it('replaces roles within the actor permissions', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(
      await setUserRolesAction({
        userId: TARGET_ID,
        roleIds: [ADMIN_ROLE],
      })
    ).toEqual({
      ok: true,
      data: undefined,
    });
    expect(usersRepo.setAdminUserRoles).toHaveBeenCalledWith(
      TARGET_ID,
      [ADMIN_ROLE],
      TEST_USER.email
    );
  });

  it('cannot remove a role the actor could not assign', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ roleIds: [POWER_ROLE] }) as never
    );
    expect(
      await setUserRolesAction({ userId: TARGET_ID, roleIds: [] })
    ).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(usersRepo.setAdminUserRoles).not.toHaveBeenCalled();
  });

  it('super-admin can grant super-admin', async () => {
    authed(ADMIN_PERMS, { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(
      (
        await setUserRolesAction({
          userId: TARGET_ID,
          roleIds: [SUPER_ROLE],
        })
      ).ok
    ).toBe(true);
  });
});

describe('resetPasswordAction', () => {
  it('sets the password and requires a change on next sign-in', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    vi.mocked(authAdmin.setAuthUserPassword).mockResolvedValue({ ok: true });
    expect(
      (
        await resetPasswordAction({
          userId: TARGET_ID,
          password: 'another-long-pass',
        })
      ).ok
    ).toBe(true);
    expect(authAdmin.setAuthUserPassword).toHaveBeenCalledWith(
      TARGET_ID,
      'another-long-pass'
    );
    expect(usersRepo.setMustChangePassword).toHaveBeenCalledWith(
      TARGET_ID,
      true
    );
    expect(authAdmin.revokeAuthUserSessions).toHaveBeenCalledWith(TARGET_ID);
  });

  it('returns SESSIONS_NOT_REVOKED when session revoke fails after a reset', async () => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    vi.mocked(authAdmin.setAuthUserPassword).mockResolvedValue({ ok: true });
    vi.mocked(authAdmin.revokeAuthUserSessions).mockResolvedValue(false);
    expect(
      await resetPasswordAction({
        userId: TARGET_ID,
        password: 'another-long-pass',
      })
    ).toEqual({ ok: false, error: 'SESSIONS_NOT_REVOKED' });
  });
});

describe('disable / enable', () => {
  beforeEach(() => {
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
  });

  it('disables in the DB even when the ban fails', async () => {
    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(false);
    expect(await disableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'BAN_FAILED',
    });
    expect(usersRepo.setAdminUserDisabled).toHaveBeenCalledWith(
      TARGET_ID,
      true
    );
    expect(authAdmin.revokeAuthUserSessions).toHaveBeenCalledWith(TARGET_ID);
  });

  it('returns SESSIONS_NOT_REVOKED when disable revoke fails', async () => {
    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(true);
    vi.mocked(authAdmin.revokeAuthUserSessions).mockResolvedValue(false);
    expect(await disableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'SESSIONS_NOT_REVOKED',
    });
  });

  it('enable lifts the ban before clearing the flag', async () => {
    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(false);
    expect(await enableUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'FAILED',
    });
    expect(usersRepo.setAdminUserDisabled).not.toHaveBeenCalled();

    vi.mocked(authAdmin.setAuthUserBanned).mockResolvedValue(true);
    expect((await enableUserAction({ userId: TARGET_ID })).ok).toBe(true);
    expect(usersRepo.setAdminUserDisabled).toHaveBeenCalledWith(
      TARGET_ID,
      false
    );
  });
});

describe('deleteUserAction', () => {
  it('throws without users.delete (admins)', async () => {
    await expect(deleteUserAction({ userId: TARGET_ID })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('requires the user to be disabled first', async () => {
    authed(ADMIN_PERMS.concat('users.delete'), { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target() as never
    );
    expect(await deleteUserAction({ userId: TARGET_ID })).toEqual({
      ok: false,
      error: 'MUST_DISABLE_FIRST',
    });
    expect(authAdmin.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('deletes the auth user, then the row', async () => {
    authed(ADMIN_PERMS.concat('users.delete'), { isSuperAdmin: true });
    vi.mocked(usersRepo.findAdminUserWithRoles).mockResolvedValue(
      target({ disabled: true }) as never
    );
    vi.mocked(authAdmin.deleteAuthUser).mockResolvedValue(true);
    expect((await deleteUserAction({ userId: TARGET_ID })).ok).toBe(true);
    expect(usersRepo.deleteAdminUserRecord).toHaveBeenCalledWith(TARGET_ID);
  });
});

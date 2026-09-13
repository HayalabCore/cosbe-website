import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeRawUnsafe = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { $executeRawUnsafe: (...a: unknown[]) => executeRawUnsafe(...a) },
}));

const admin = {
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { admin } })),
}));

import {
  authUserExists,
  createAuthUser,
  deleteAuthUser,
  listAuthUsers,
  revokeAuthUserSessions,
  setAuthUserBanned,
  setAuthUserPassword,
} from './admin-core';

describe('supabase admin-core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
  });

  it('pages through listUsers and marks banned users', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `u${i}`,
      email: `u${i}@x.test`,
      last_sign_in_at: null,
      banned_until: i === 0 ? future : null,
    }));
    admin.listUsers
      .mockResolvedValueOnce({ data: { users: page1 }, error: null })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'last',
              email: 'l@x.test',
              last_sign_in_at: '2026-01-01T00:00:00Z',
              banned_until: null,
            },
          ],
        },
        error: null,
      });
    const users = await listAuthUsers();
    expect(users).toHaveLength(1001);
    expect(users[0].banned).toBe(true);
    expect(users[1].banned).toBe(false);
    expect(users[1000].lastSignInAt).toBe('2026-01-01T00:00:00Z');
    expect(admin.listUsers).toHaveBeenCalledWith({
      page: 2,
      perPage: 1000,
    });
  });

  it('createAuthUser confirms the email and maps error codes', async () => {
    admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'new' } },
      error: null,
    });
    expect(await createAuthUser('a@x.test', 'long-password-1')).toEqual({
      ok: true,
      id: 'new',
    });
    expect(admin.createUser).toHaveBeenCalledWith({
      email: 'a@x.test',
      password: 'long-password-1',
      email_confirm: true,
    });

    admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_exists', message: 'exists' },
    });
    expect(await createAuthUser('a@x.test', 'x')).toEqual({
      ok: false,
      error: 'EMAIL_EXISTS',
    });

    admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'weak_password', message: 'weak' },
    });
    expect(await createAuthUser('a@x.test', 'x')).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
  });

  it('setAuthUserPassword maps weak passwords', async () => {
    admin.updateUserById.mockResolvedValueOnce({
      data: {},
      error: { code: 'weak_password', message: 'weak' },
    });
    expect(await setAuthUserPassword('u', 'x')).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
  });

  it('setAuthUserBanned uses the ban durations', async () => {
    admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    expect(await setAuthUserBanned('u', true)).toBe(true);
    expect(admin.updateUserById).toHaveBeenLastCalledWith('u', {
      ban_duration: '876000h',
    });
    await setAuthUserBanned('u', false);
    expect(admin.updateUserById).toHaveBeenLastCalledWith('u', {
      ban_duration: 'none',
    });
  });

  it('authUserExists is false when getUserById fails', async () => {
    admin.getUserById.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'user_not_found' },
    });
    expect(await authUserExists('u')).toBe(false);
    admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'u' } },
      error: null,
    });
    expect(await authUserExists('u')).toBe(true);
  });

  it('revokeAuthUserSessions deletes auth.sessions only', async () => {
    executeRawUnsafe.mockResolvedValue(1);
    expect(await revokeAuthUserSessions('user-1')).toBe(true);
    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      'DELETE FROM auth.sessions WHERE user_id = $1::uuid',
      'user-1'
    );
  });

  it('revokeAuthUserSessions fails when sessions cannot be deleted', async () => {
    executeRawUnsafe.mockRejectedValueOnce(new Error('no auth schema'));
    expect(await revokeAuthUserSessions('user-1')).toBe(false);
  });

  it('deleteAuthUser treats a missing user as deleted', async () => {
    admin.deleteUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'user_not_found', message: 'missing' },
    });
    expect(await deleteAuthUser('u')).toBe(true);
    admin.deleteUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'unexpected_failure', message: 'boom' },
    });
    expect(await deleteAuthUser('u')).toBe(false);
  });
});

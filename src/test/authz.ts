import { vi } from 'vitest';
import {
  requireActiveSession,
  requireAnyPermission,
  requirePermission,
} from '@/lib/authz';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

export const TEST_USER = { id: 'user-1', email: 'admin@test.local' };

/**
 * Configures the mocked authz module (see the inline `vi.mock('@/lib/authz')`
 * factory each test file declares) to enforce `permissions`.
 */
export function authed(
  permissions: readonly Permission[] = ALL_PERMISSIONS,
  { isSuperAdmin = false }: { isSuperAdmin?: boolean } = {}
) {
  const ctx = {
    status: 'active' as const,
    user: TEST_USER,
    admin: { id: TEST_USER.id, email: TEST_USER.email },
    supabase: {
      storage: { from: vi.fn() },
      auth: { updateUser: vi.fn(), signInWithPassword: vi.fn() },
    },
    actor: {
      userId: TEST_USER.id,
      permissions: new Set<Permission>(permissions),
      isSuperAdmin,
    },
  };
  vi.mocked(requirePermission).mockImplementation(async (...perms) => {
    if (!perms.every((p) => ctx.actor.permissions.has(p))) {
      throw new Error('Forbidden');
    }
    return ctx as never;
  });
  vi.mocked(requireAnyPermission).mockImplementation(async (...perms) => {
    if (!perms.some((p) => ctx.actor.permissions.has(p))) {
      throw new Error('Forbidden');
    }
    return ctx as never;
  });
  if (vi.isMockFunction(requireActiveSession)) {
    vi.mocked(requireActiveSession).mockResolvedValue(ctx as never);
  }
  return ctx;
}

export function unauth() {
  const err = () => Promise.reject(new Error('Unauthorized'));
  vi.mocked(requirePermission).mockImplementation(err);
  vi.mocked(requireAnyPermission).mockImplementation(err);
  if (vi.isMockFunction(requireActiveSession)) {
    vi.mocked(requireActiveSession).mockImplementation(err);
  }
}

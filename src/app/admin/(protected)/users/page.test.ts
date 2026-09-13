import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('@/actions/users', () => ({ listUsersAction: vi.fn() }));
vi.mock('@/actions/roles', () => ({ listRolesAction: vi.fn() }));
vi.mock('./UsersClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({
  default: () => null,
}));

import UsersPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { listUsersAction } from '@/actions/users';
import { listRolesAction } from '@/actions/roles';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

function active(perms: string[]) {
  vi.mocked(getCurrentAdmin).mockResolvedValue({
    status: 'active',
    user: { id: 'u' },
    actor: {
      userId: 'u',
      permissions: new Set(perms),
      isSuperAdmin: false,
    },
  } as never);
}

describe('UsersPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows PermissionNeeded without users.view', async () => {
    active(['dashboard.view']);
    const el = (await UsersPage()) as { type: unknown };
    expect(el.type).toBe(PermissionNeeded);
    expect(listUsersAction).not.toHaveBeenCalled();
  });

  it('loads users and roles and passes a serializable actor', async () => {
    active(['users.view']);
    vi.mocked(listUsersAction).mockResolvedValue([]);
    vi.mocked(listRolesAction).mockResolvedValue([]);
    const el = (await UsersPage()) as {
      props: { actor: { permissions: string[] } };
    };
    expect(el.props.actor.permissions).toEqual(['users.view']);
  });
});

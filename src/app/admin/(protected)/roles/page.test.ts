import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('@/actions/roles', () => ({ listRolesAction: vi.fn() }));
vi.mock('./RolesClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({ default: () => null }));

import RolesPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { listRolesAction } from '@/actions/roles';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

function active(perms: string[]) {
  vi.mocked(getCurrentAdmin).mockResolvedValue({
    status: 'active',
    user: { id: 'u' },
    actor: { userId: 'u', permissions: new Set(perms), isSuperAdmin: false },
  } as never);
}

describe('RolesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows PermissionNeeded without roles.manage', async () => {
    active(['users.view']);
    const el = (await RolesPage()) as { type: unknown };
    expect(el.type).toBe(PermissionNeeded);
    expect(listRolesAction).not.toHaveBeenCalled();
  });

  it('loads roles with roles.manage', async () => {
    active(['roles.manage']);
    vi.mocked(listRolesAction).mockResolvedValue([]);
    await RolesPage();
    expect(listRolesAction).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/roles-repository', () => ({
  listRoles: vi.fn(),
  getRoleById: vi.fn(),
  roleKeyExists: vi.fn(),
  createRoleRecord: vi.fn(),
  updateRoleRecord: vi.fn(),
  deleteRoleRecord: vi.fn(),
}));

import {
  createRoleAction,
  deleteRoleAction,
  listRolesAction,
  updateRoleAction,
} from './roles';
import * as rolesRepo from '@/lib/roles-repository';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

const ROLE_ID = '6d2c1e4a-3b5f-4a7e-8c9d-0e1f2a3b4c5d';
const ADMIN_PERMS = DEFAULT_ROLE_PERMISSIONS.admin;

function role(
  overrides: Partial<Awaited<ReturnType<typeof rolesRepo.getRoleById>>> = {}
) {
  return {
    id: ROLE_ID,
    key: 'editor',
    name: 'Editor',
    description: null,
    isSystem: false,
    permissions: ['articles.edit'],
    userCount: 2,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authed(ADMIN_PERMS);
});

describe('listRolesAction', () => {
  it('is allowed with users.view', async () => {
    authed(['users.view']);
    vi.mocked(rolesRepo.listRoles).mockResolvedValue([role()]);
    expect(await listRolesAction()).toEqual([role()]);
  });

  it('throws without users.view or roles.manage', async () => {
    authed(['dashboard.view']);
    await expect(listRolesAction()).rejects.toThrow('Forbidden');
  });
});

describe('createRoleAction', () => {
  it('creates a role within the actor permissions', async () => {
    vi.mocked(rolesRepo.roleKeyExists).mockResolvedValue(false);
    vi.mocked(rolesRepo.createRoleRecord).mockResolvedValue(ROLE_ID);
    expect(
      await createRoleAction({
        key: 'content-editor',
        name: 'Content editor',
        permissions: ['articles.edit', 'media.upload'],
      })
    ).toEqual({ ok: true, data: { id: ROLE_ID } });
    expect(rolesRepo.createRoleRecord).toHaveBeenCalledWith({
      key: 'content-editor',
      name: 'Content editor',
      description: null,
      permissions: ['articles.edit', 'media.upload'],
    });
  });

  it('refuses permissions the actor lacks', async () => {
    expect(
      await createRoleAction({
        key: 'x',
        name: 'X',
        permissions: ['users.delete'],
      })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
    expect(rolesRepo.createRoleRecord).not.toHaveBeenCalled();
  });

  it('reports duplicate keys', async () => {
    vi.mocked(rolesRepo.roleKeyExists).mockResolvedValue(true);
    expect(
      await createRoleAction({ key: 'editor', name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'KEY_EXISTS' });
  });

  it('throws without roles.manage', async () => {
    authed(['users.view']);
    await expect(
      createRoleAction({ key: 'x', name: 'X', permissions: [] })
    ).rejects.toThrow('Forbidden');
  });
});

describe('updateRoleAction', () => {
  it('updates a role', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(role());
    expect(
      (
        await updateRoleAction({
          roleId: ROLE_ID,
          name: 'Editor',
          permissions: ['articles.edit', 'articles.publish'],
        })
      ).ok
    ).toBe(true);
    expect(rolesRepo.updateRoleRecord).toHaveBeenCalledWith(ROLE_ID, {
      name: 'Editor',
      description: null,
      permissions: ['articles.edit', 'articles.publish'],
    });
  });

  it('refuses the system role even for super-admins', async () => {
    authed(ADMIN_PERMS, { isSuperAdmin: true });
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ key: 'super-admin', isSystem: true, permissions: [] })
    );
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('refuses stripping a role more powerful than the actor', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ permissions: ['users.delete'] })
    );
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('returns NOT_FOUND', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(null);
    expect(
      await updateRoleAction({ roleId: ROLE_ID, name: 'X', permissions: [] })
    ).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('deleteRoleAction', () => {
  it('deletes a role the actor fully holds', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(role());
    expect((await deleteRoleAction({ roleId: ROLE_ID })).ok).toBe(true);
    expect(rolesRepo.deleteRoleRecord).toHaveBeenCalledWith(ROLE_ID);
  });

  it('refuses the system role', async () => {
    vi.mocked(rolesRepo.getRoleById).mockResolvedValue(
      role({ key: 'super-admin', isSystem: true, permissions: [] })
    );
    expect(await deleteRoleAction({ roleId: ROLE_ID })).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
  });
});

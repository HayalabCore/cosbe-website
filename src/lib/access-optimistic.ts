import type { AdminUserRow, RoleRow } from '@/lib/access-types';
import { resolvePermissions } from '@/lib/permissions';

export function userWithRoles(
  user: AdminUserRow,
  roleIds: string[],
  allRoles: RoleRow[]
): AdminUserRow {
  const selected = allRoles.filter((r) => roleIds.includes(r.id));
  const { permissions, isSuperAdmin } = resolvePermissions(
    selected.map((r) => ({ key: r.key, permissions: r.permissions }))
  );
  return {
    ...user,
    roleIds,
    permissions: [...permissions],
    isSuperAdmin,
  };
}

export function createdUserRow({
  id,
  email,
  displayName,
  roleIds,
  roles,
}: {
  id: string;
  email: string;
  displayName: string;
  roleIds: string[];
  roles: RoleRow[];
}): AdminUserRow {
  return userWithRoles(
    {
      id,
      email,
      displayName: displayName.trim() || null,
      disabled: false,
      mustChangePassword: true,
      isSuperAdmin: false,
      roleIds,
      permissions: [],
      createdAt: new Date().toISOString(),
      lastSignInAt: null,
    },
    roleIds,
    roles
  );
}

export function createdRoleRow({
  id,
  key,
  name,
  description,
  permissions,
}: {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
}): RoleRow {
  return {
    id,
    key,
    name,
    description: description.trim() || null,
    isSystem: false,
    permissions,
    userCount: 0,
  };
}

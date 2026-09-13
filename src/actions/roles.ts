'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyPermission, requirePermission } from '@/lib/authz';
import { canDeleteRole, canEditRole } from '@/lib/authz-rules';
import {
  createRoleRecord,
  deleteRoleRecord,
  getRoleById,
  listRoles,
  roleKeyExists,
  updateRoleRecord,
} from '@/lib/roles-repository';
import {
  createRoleSchema,
  roleIdSchema,
  updateRoleSchema,
} from '@/lib/validation/access';
import type { AccessResult, RoleRow } from '@/lib/access-types';

function revalidateAccessPages() {
  revalidatePath('/admin/roles');
  revalidatePath('/admin/users');
}

/** The users page needs role names too, so users.view is enough to list. */
export async function listRolesAction(): Promise<RoleRow[]> {
  await requireAnyPermission('users.view', 'roles.manage');
  return listRoles();
}

export async function createRoleAction(input: {
  key: string;
  name: string;
  description?: string | null;
  permissions: string[];
}): Promise<AccessResult<{ id: string }>> {
  const ctx = await requirePermission('roles.manage');
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  if (!canEditRole(ctx.actor, null, parsed.data.permissions)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  if (await roleKeyExists(parsed.data.key)) {
    return { ok: false, error: 'KEY_EXISTS' };
  }
  const id = await createRoleRecord(parsed.data);
  revalidateAccessPages();
  return { ok: true, data: { id } };
}

export async function updateRoleAction(input: {
  roleId: string;
  name: string;
  description?: string | null;
  permissions: string[];
}): Promise<AccessResult> {
  const ctx = await requirePermission('roles.manage');
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const role = await getRoleById(parsed.data.roleId);
  if (!role) return { ok: false, error: 'NOT_FOUND' };
  if (!canEditRole(ctx.actor, role, parsed.data.permissions)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  await updateRoleRecord(role.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    permissions: parsed.data.permissions,
  });
  revalidateAccessPages();
  return { ok: true, data: undefined };
}

export async function deleteRoleAction(input: {
  roleId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('roles.manage');
  const parsed = roleIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const role = await getRoleById(parsed.data.roleId);
  if (!role) return { ok: false, error: 'NOT_FOUND' };
  if (!canDeleteRole(ctx.actor, role)) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  await deleteRoleRecord(role.id);
  revalidateAccessPages();
  return { ok: true, data: undefined };
}

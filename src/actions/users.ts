'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, type AuthzContext } from '@/lib/authz';
import { canAssignRole, canModifyUser } from '@/lib/authz-rules';
import {
  adoptAdminUserId,
  createAdminUserRecord,
  deleteAdminUserRecord,
  findAdminUserByEmail,
  findAdminUserWithRoles,
  isSuperAdminUser,
  listAdminUsers,
  permissionsOf,
  setAdminUserDisabled,
  setAdminUserRoles,
  setMustChangePassword,
  type AdminUserWithRoles,
} from '@/lib/admin-users-repository';
import { isEmailUniqueConflict } from '@/lib/prisma-errors';
import { getRolesByIds } from '@/lib/roles-repository';
import {
  authUserExists,
  createAuthUser,
  deleteAuthUser,
  listAuthUsers,
  revokeAuthUserSessions,
  setAuthUserBanned,
  setAuthUserPassword,
} from '@/lib/supabase/admin';
import {
  createUserSchema,
  resetPasswordSchema,
  setUserRolesSchema,
  userIdSchema,
} from '@/lib/validation/access';
import type { AccessResult, AdminUserRow } from '@/lib/access-types';

const USERS_PATH = '/admin/users';

function actorEmail(ctx: AuthzContext): string {
  return ctx.user.email ?? ctx.user.id;
}

/** Loads a user the actor is allowed to modify (rules 2 + 3 + 4). */
async function loadModifiableUser(
  ctx: AuthzContext,
  userId: string
): Promise<AccessResult<AdminUserWithRoles>> {
  const user = await findAdminUserWithRoles(userId);
  if (!user) return { ok: false, error: 'NOT_FOUND' };
  if (
    !canModifyUser(ctx.actor, {
      id: user.id,
      isSuperAdmin: isSuperAdminUser(user),
      permissions: permissionsOf(user),
    })
  ) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  return { ok: true, data: user };
}

async function rollbackCreatedAuthUser(
  id: string
): Promise<AccessResult<never>> {
  return (await deleteAuthUser(id))
    ? { ok: false, error: 'FAILED' }
    : { ok: false, error: 'AUTH_ORPHAN' };
}

/** Rule 3: every role being added or removed must be assignable by the actor. */
async function checkAssignable(
  ctx: AuthzContext,
  roleIds: string[]
): Promise<AccessResult> {
  if (roleIds.length === 0) return { ok: true, data: undefined };
  const roles = await getRolesByIds(roleIds);
  if (roles.length !== roleIds.length) {
    return { ok: false, error: 'INVALID_INPUT' };
  }
  if (!roles.every((role) => canAssignRole(ctx.actor, role))) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  return { ok: true, data: undefined };
}

export async function listUsersAction(): Promise<AdminUserRow[]> {
  await requirePermission('users.view');
  const [users, authUsers] = await Promise.all([
    listAdminUsers(),
    // Last sign-in is nice to have; don't break the page if the auth API fails.
    listAuthUsers().catch((error: unknown) => {
      console.error('[listUsersAction] listAuthUsers', error);
      return [];
    }),
  ]);
  const lastSignIn = new Map(authUsers.map((u) => [u.id, u.lastSignInAt]));
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    disabled: u.disabled,
    mustChangePassword: u.mustChangePassword,
    isSuperAdmin: isSuperAdminUser(u),
    roleIds: u.roles.map((r) => r.roleId),
    permissions: permissionsOf(u),
    createdAt: u.createdAt.toISOString(),
    lastSignInAt: lastSignIn.get(u.id) ?? null,
  }));
}

export async function createUserAction(input: {
  email: string;
  displayName?: string | null;
  password: string;
  roleIds: string[];
}): Promise<AccessResult<{ id: string; email: string }>> {
  const ctx = await requirePermission('users.create');
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const { email, displayName, password, roleIds } = parsed.data;

  const assignable = await checkAssignable(ctx, roleIds);
  if (!assignable.ok) return assignable;

  const created = await createAuthUser(email, password);
  if (!created.ok) return created;

  try {
    await createAdminUserRecord({
      id: created.id,
      email,
      displayName,
      createdBy: actorEmail(ctx),
      roleIds,
    });
  } catch (error) {
    console.error('[createUserAction]', error);
    if (isEmailUniqueConflict(error)) {
      const owner = await findAdminUserByEmail(email);
      if (owner && !(await authUserExists(owner.id))) {
        try {
          await adoptAdminUserId(owner.id, created.id, email, {
            disabled: false,
            displayName,
            createdBy: actorEmail(ctx),
            roleIds,
            mustChangePassword: true,
          });
          revalidatePath(USERS_PATH);
          return { ok: true, data: { id: created.id, email } };
        } catch (adoptError) {
          console.error('[createUserAction] adopt', adoptError);
          return rollbackCreatedAuthUser(created.id);
        }
      }
      const deleted = await deleteAuthUser(created.id);
      return {
        ok: false,
        error: deleted ? 'EMAIL_EXISTS' : 'AUTH_ORPHAN',
      };
    }
    return rollbackCreatedAuthUser(created.id);
  }
  revalidatePath(USERS_PATH);
  return { ok: true, data: { id: created.id, email } };
}

export async function resetPasswordAction(input: {
  userId: string;
  password: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.create');
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  try {
    const updated = await setAuthUserPassword(
      target.data.id,
      parsed.data.password
    );
    if (!updated.ok) return updated;
    await setMustChangePassword(target.data.id, true);
    if (!(await revokeAuthUserSessions(target.data.id))) {
      revalidatePath(USERS_PATH);
      return { ok: false, error: 'SESSIONS_NOT_REVOKED' };
    }
    revalidatePath(USERS_PATH);
    return { ok: true, data: undefined };
  } catch (error) {
    console.error('[resetPasswordAction]', error);
    return { ok: false, error: 'FAILED' };
  }
}

export async function setUserRolesAction(input: {
  userId: string;
  roleIds: string[];
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.assign-roles');
  const parsed = setUserRolesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  const current = new Set(target.data.roles.map((r) => r.roleId));
  const next = new Set(parsed.data.roleIds);
  const changed = [
    ...parsed.data.roleIds.filter((id) => !current.has(id)),
    ...[...current].filter((id) => !next.has(id)),
  ];
  const assignable = await checkAssignable(ctx, changed);
  if (!assignable.ok) return assignable;

  await setAdminUserRoles(target.data.id, parsed.data.roleIds, actorEmail(ctx));
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

export async function disableUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.disable');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  // DB flag first: it blocks access on the next request even if the ban fails.
  await setAdminUserDisabled(target.data.id, true);
  const banned = await setAuthUserBanned(target.data.id, true);
  const revoked = await revokeAuthUserSessions(target.data.id);
  revalidatePath(USERS_PATH);
  if (!banned) return { ok: false, error: 'BAN_FAILED' };
  if (!revoked) return { ok: false, error: 'SESSIONS_NOT_REVOKED' };
  return { ok: true, data: undefined };
}

export async function enableUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.disable');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;

  // Lift the ban first so a re-enabled user can actually sign in.
  if (!(await setAuthUserBanned(target.data.id, false))) {
    return { ok: false, error: 'FAILED' };
  }
  await setAdminUserDisabled(target.data.id, false);
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

export async function deleteUserAction(input: {
  userId: string;
}): Promise<AccessResult> {
  const ctx = await requirePermission('users.delete');
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const target = await loadModifiableUser(ctx, parsed.data.userId);
  if (!target.ok) return target;
  if (!target.data.disabled) {
    return { ok: false, error: 'MUST_DISABLE_FIRST' };
  }

  if (!(await deleteAuthUser(target.data.id))) {
    return { ok: false, error: 'FAILED' };
  }
  await deleteAdminUserRecord(target.data.id);
  revalidatePath(USERS_PATH);
  return { ok: true, data: undefined };
}

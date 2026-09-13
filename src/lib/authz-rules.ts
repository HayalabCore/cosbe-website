import {
  SUPER_ADMIN_ROLE_KEY,
  isPermission,
  type Permission,
} from '@/lib/permissions';

/**
 * Pure access-management guardrails. Server actions enforce these; the admin
 * UI calls the same functions only to disable controls.
 */
export type Actor = {
  userId: string;
  permissions: ReadonlySet<Permission>;
  isSuperAdmin: boolean;
};

export type RoleLike = {
  key: string;
  isSystem: boolean;
  permissions: readonly string[];
};

export function holdsAll(actor: Actor, perms: readonly string[]): boolean {
  if (actor.isSuperAdmin) return true;
  return perms.every((p) => !isPermission(p) || actor.permissions.has(p));
}

/** Rules 2 + 3: super-admin role is super-admin-only; no escalation. */
export function canAssignRole(actor: Actor, role: RoleLike): boolean {
  if (role.key === SUPER_ADMIN_ROLE_KEY || role.isSystem) {
    return actor.isSuperAdmin;
  }
  return holdsAll(actor, role.permissions);
}

/**
 * Rules 2 + 3 + 4: never yourself; super-admin targets need a super-admin;
 * no taking over a user who holds permissions you lack.
 */
export function canModifyUser(
  actor: Actor,
  target: {
    id: string;
    isSuperAdmin: boolean;
    permissions: readonly string[];
  }
): boolean {
  if (target.id === actor.userId) return false;
  if (target.isSuperAdmin && !actor.isSuperAdmin) return false;
  return holdsAll(actor, target.permissions);
}

/** Rules 1 + 3. `role === null` means creating a new role. */
export function canEditRole(
  actor: Actor,
  role: RoleLike | null,
  nextPermissions: readonly string[]
): boolean {
  if (role?.isSystem) return false;
  return (
    holdsAll(actor, role?.permissions ?? []) && holdsAll(actor, nextPermissions)
  );
}

export function canDeleteRole(actor: Actor, role: RoleLike): boolean {
  if (role.isSystem) return false;
  return holdsAll(actor, role.permissions);
}

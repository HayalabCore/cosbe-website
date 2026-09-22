import { findAdminUserWithRoles, rolesOf } from '@/lib/admin-users-repository';
import { resolvePermissions, type Permission } from '@/lib/permissions';

/**
 * The worker has no session. It re-checks the run creator's current
 * permissions from the database before doing any work.
 */
export async function actorHasPermission(
  userId: string | null,
  permission: Permission
): Promise<boolean> {
  if (!userId) return false;
  const user = await findAdminUserWithRoles(userId);
  if (!user || user.disabled || user.mustChangePassword) return false;
  return resolvePermissions(rolesOf(user)).permissions.has(permission);
}

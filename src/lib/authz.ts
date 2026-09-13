import 'server-only';

import { cache } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  adoptAdminUserId,
  EmailOwnedByOtherRowError,
  findAdminUserWithRoles,
  provisionAdminUser,
  rolesOf,
  type AdminUserWithRoles,
} from '@/lib/admin-users-repository';
import { authUserExists } from '@/lib/supabase/admin';
import { resolvePermissions, type Permission } from '@/lib/permissions';
import type { Actor } from '@/lib/authz-rules';

export const UNAUTHORIZED_ERROR = 'Unauthorized';
export const FORBIDDEN_ERROR = 'Forbidden';

type Session = {
  supabase: SupabaseClient;
  user: User;
  admin: AdminUserWithRoles;
};

export type CurrentAdmin =
  | { status: 'unauthenticated' }
  | ({ status: 'disabled' } & Session)
  | ({ status: 'must-change-password' } & Session)
  | ({ status: 'active'; actor: Actor } & Session);

export type AuthzContext = Extract<CurrentAdmin, { status: 'active' }>;

async function provisionOrAdoptAdminUser(
  id: string,
  email: string
): Promise<AdminUserWithRoles> {
  try {
    return await provisionAdminUser(id, email);
  } catch (error) {
    if (
      error instanceof EmailOwnedByOtherRowError &&
      !(await authUserExists(error.existingId))
    ) {
      return adoptAdminUserId(error.existingId, id, email, {
        disabled: false,
      });
    }
    throw error;
  }
}

/**
 * The single authorization chokepoint. Verifies the session with the auth
 * server (`getUser`, not `getSession`), then loads the admin row + roles once
 * per request. A Supabase user without a row gets one with no roles.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'unauthenticated' };

  const email = user.email ?? `${user.id}@unknown`;
  const existing = await findAdminUserWithRoles(user.id);
  let admin: AdminUserWithRoles;
  if (!existing) {
    admin = await provisionOrAdoptAdminUser(user.id, email);
  } else if (user.email && existing.email !== user.email) {
    try {
      admin = await provisionAdminUser(user.id, user.email);
    } catch (error) {
      if (error instanceof EmailOwnedByOtherRowError) {
        console.error(
          '[getCurrentAdmin] email already belongs to another row; keeping existing',
          error.existingId
        );
        admin = existing;
      } else {
        throw error;
      }
    }
  } else {
    admin = existing;
  }

  if (admin.disabled) return { status: 'disabled', supabase, user, admin };
  if (admin.mustChangePassword) {
    return { status: 'must-change-password', supabase, user, admin };
  }

  const { permissions, isSuperAdmin } = resolvePermissions(rolesOf(admin));
  return {
    status: 'active',
    supabase,
    user,
    admin,
    actor: { userId: user.id, permissions, isSuperAdmin },
  };
});

async function requireActive(): Promise<AuthzContext> {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') throw new Error(UNAUTHORIZED_ERROR);
  if (current.status !== 'active') throw new Error(FORBIDDEN_ERROR);
  return current;
}

/** Server actions: throws unless the user holds every listed permission. */
export async function requirePermission(
  ...perms: Permission[]
): Promise<AuthzContext> {
  const ctx = await requireActive();
  if (!perms.every((p) => ctx.actor.permissions.has(p))) {
    throw new Error(FORBIDDEN_ERROR);
  }
  return ctx;
}

/** Server actions: throws unless the user holds at least one listed permission. */
export async function requireAnyPermission(
  ...perms: Permission[]
): Promise<AuthzContext> {
  const ctx = await requireActive();
  if (!perms.some((p) => ctx.actor.permissions.has(p))) {
    throw new Error(FORBIDDEN_ERROR);
  }
  return ctx;
}

/** Signed in and not disabled; allowed while a password change is pending. */
export async function requireActiveSession(): Promise<
  Exclude<CurrentAdmin, { status: 'unauthenticated' | 'disabled' }>
> {
  const current = await getCurrentAdmin();
  if (current.status === 'unauthenticated') throw new Error(UNAUTHORIZED_ERROR);
  if (current.status === 'disabled') throw new Error(FORBIDDEN_ERROR);
  return current;
}

/** Pages: non-throwing check. */
export async function hasPermission(perm: Permission): Promise<boolean> {
  const current = await getCurrentAdmin();
  return current.status === 'active' && current.actor.permissions.has(perm);
}

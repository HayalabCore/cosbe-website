import type { AuthUserSummary } from '@/lib/supabase/admin-core';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'bivav.r.s@cosbe.inc';

export class BootstrapError extends Error {}

export type BootstrapPlan = {
  newRows: { id: string; email: string; disabled: boolean }[];
  superAdminUserId: string;
  superAdminBanned: boolean;
  adminRoleUserIds: string[];
  skippedWithoutEmail: string[];
  emailClashes: {
    id: string;
    email: string;
    existingId: string;
    existingHasRoles: boolean;
  }[];
};

export function parseBootstrapArgs(argv: string[]): {
  dryRun: boolean;
  force: boolean;
  superAdminEmail: string;
} {
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const i = argv.indexOf('--super-admin');
  if (i >= 0) {
    const next = argv[i + 1];
    if (!next || next.startsWith('-')) {
      throw new BootstrapError('--super-admin requires an email address.');
    }
    return { dryRun, force, superAdminEmail: next.trim().toLowerCase() };
  }
  return { dryRun, force, superAdminEmail: BOOTSTRAP_SUPER_ADMIN_EMAIL };
}

/**
 * Pure planning step for `yarn db:bootstrap-admins`: existing Supabase users
 * were all admins before roles existed, so they get the Admin role; the
 * configured email gets Super-admin. Existing rows and roles are never changed.
 */
export function planBootstrap(input: {
  authUsers: AuthUserSummary[];
  existingUserIds: ReadonlySet<string>;
  existingEmailToId?: ReadonlyMap<string, string>;
  userIdsWithRoles: ReadonlySet<string>;
  superAdminEmail: string;
}): BootstrapPlan {
  const target = input.superAdminEmail.trim().toLowerCase();
  const withEmail = input.authUsers.filter((u) => u.email);
  const skippedWithoutEmail = input.authUsers
    .filter((u) => !u.email)
    .map((u) => u.id);

  const superAdmin = withEmail.find((u) => u.email!.toLowerCase() === target);
  if (!superAdmin) {
    throw new BootstrapError(
      `No Supabase Auth user with email ${target}. Nothing was written.`
    );
  }

  const emailToId = new Map(
    [...(input.existingEmailToId ?? [])].map(([e, id]) => [e.toLowerCase(), id])
  );
  const emailClashes: BootstrapPlan['emailClashes'] = [];
  const newRows: BootstrapPlan['newRows'] = [];
  const clashIds = new Set<string>();
  for (const u of withEmail) {
    if (input.existingUserIds.has(u.id)) continue;
    const email = u.email!.toLowerCase();
    const existingId = emailToId.get(email);
    if (existingId && existingId !== u.id) {
      emailClashes.push({
        id: u.id,
        email,
        existingId,
        existingHasRoles: input.userIdsWithRoles.has(existingId),
      });
      clashIds.add(u.id);
      continue;
    }
    newRows.push({ id: u.id, email, disabled: u.banned });
  }

  return {
    newRows,
    superAdminUserId: superAdmin.id,
    superAdminBanned: superAdmin.banned,
    adminRoleUserIds: withEmail
      .filter(
        (u) =>
          u.id !== superAdmin.id &&
          !input.userIdsWithRoles.has(u.id) &&
          !clashIds.has(u.id)
      )
      .map((u) => u.id),
    skippedWithoutEmail,
    emailClashes,
  };
}

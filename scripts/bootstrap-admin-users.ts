/**
 * Bootstrap admin_users / user_roles from existing Supabase Auth users.
 *
 * - Every Supabase user without a row gets one (banned users are imported as disabled).
 * - BOOTSTRAP_SUPER_ADMIN_EMAIL (or --super-admin <email>) gets Super-admin.
 * - Every other user with no roles gets Admin (they were all admins before roles existed).
 * - Refuses to run once a super-admin exists, unless --force.
 *
 * Usage (from repo root; DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set):
 *   yarn db:bootstrap-admins --dry-run
 *   yarn db:bootstrap-admins
 */

import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import { authUserExists, listAuthUsers } from '../src/lib/supabase/admin-core';
import { adoptAdminUserId } from '../src/lib/admin-users-repository';
import {
  BootstrapError,
  parseBootstrapArgs,
  planBootstrap,
} from '../src/lib/admin-bootstrap-plan';
import { SUPER_ADMIN_ROLE_KEY } from '../src/lib/permissions';

async function main() {
  loadEnvConfig(process.cwd());
  const { dryRun, force, superAdminEmail } = parseBootstrapArgs(process.argv);

  const [superRole, adminRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: SUPER_ADMIN_ROLE_KEY } }),
    prisma.role.findUnique({ where: { key: 'admin' } }),
  ]);
  if (!superRole || !adminRole) {
    throw new BootstrapError(
      'Default roles are missing. Run `yarn db:deploy` first.'
    );
  }

  const existingSuperAdmins = await prisma.userRole.count({
    where: { roleId: superRole.id },
  });
  if (existingSuperAdmins > 0 && !force) {
    throw new BootstrapError(
      'A super-admin already exists, so bootstrap has already run. Re-running would give Admin to users who are meant to have no roles. Pass --force if you really mean it.'
    );
  }

  const [authUsers, rows] = await Promise.all([
    listAuthUsers(),
    prisma.adminUser.findMany({
      select: { id: true, email: true, _count: { select: { roles: true } } },
    }),
  ]);

  const plan = planBootstrap({
    authUsers,
    existingUserIds: new Set(rows.map((r) => r.id)),
    existingEmailToId: new Map(rows.map((r) => [r.email.toLowerCase(), r.id])),
    userIdsWithRoles: new Set(
      rows.filter((r) => r._count.roles > 0).map((r) => r.id)
    ),
    superAdminEmail,
  });

  console.warn(
    'WARNING: Every Auth user listed below who has no admin row or roles will become Admin. Disable public sign-ups in the Supabase dashboard (Authentication → Providers → Email → turn off “Allow new users to sign up”) before this is safe. Abort if you see unexpected emails.'
  );
  console.log(`Supabase Auth users: ${authUsers.length}`);
  for (const u of authUsers) {
    console.log(
      `  - ${u.email ?? `(no email) ${u.id}`}${u.banned ? ' (banned)' : ''}`
    );
  }

  const emailById = new Map(authUsers.map((u) => [u.id, u.email]));
  console.log(`New admin_users rows: ${plan.newRows.length}`);
  for (const r of plan.newRows) {
    console.log(
      `  + ${r.email}${r.disabled ? ' (disabled — banned in Supabase)' : ''}`
    );
  }
  console.log(`Super-admin: ${emailById.get(plan.superAdminUserId)}`);
  if (plan.superAdminBanned) {
    console.warn(
      `WARNING: Super-admin ${superAdminEmail} is banned in Supabase Auth. They will still be assigned Super-admin but cannot sign in until unbanned.`
    );
  }
  console.log(`Admin role for ${plan.adminRoleUserIds.length} user(s):`);
  for (const id of plan.adminRoleUserIds)
    console.log(`  * ${emailById.get(id)}`);
  if (plan.skippedWithoutEmail.length > 0) {
    console.log(`Skipped (no email): ${plan.skippedWithoutEmail.join(', ')}`);
  }

  const toAdopt: typeof plan.emailClashes = [];
  const adoptedAdminRoleIds: string[] = [];
  for (const clash of plan.emailClashes) {
    const live = await authUserExists(clash.existingId);
    if (live) {
      console.warn(
        `Email ${clash.email} already belongs to Auth user ${clash.existingId}; skipping ${clash.id}.`
      );
      if (clash.id === plan.superAdminUserId) {
        throw new BootstrapError(
          `Super-admin email ${clash.email} is already used by admin row ${clash.existingId} whose Auth user still exists.`
        );
      }
      continue;
    }
    if (dryRun) {
      console.log(
        `Would adopt stale row ${clash.existingId} → ${clash.id} for ${clash.email}`
      );
      continue;
    }
    toAdopt.push(clash);
    if (clash.id !== plan.superAdminUserId && !clash.existingHasRoles) {
      adoptedAdminRoleIds.push(clash.id);
    }
  }

  if (dryRun) {
    console.log('Dry run — nothing written.');
    return;
  }

  const bannedById = new Map(authUsers.map((u) => [u.id, u.banned]));
  await prisma.$transaction(async (tx) => {
    for (const clash of toAdopt) {
      await adoptAdminUserId(clash.existingId, clash.id, clash.email, {
        db: tx,
        disabled: bannedById.get(clash.id) ?? false,
      });
      console.log(
        `Adopted stale row ${clash.existingId} → ${clash.id} for ${clash.email}`
      );
    }
    await tx.adminUser.createMany({
      data: plan.newRows,
      skipDuplicates: true,
    });
    await tx.userRole.createMany({
      data: [
        {
          userId: plan.superAdminUserId,
          roleId: superRole.id,
          assignedBy: 'bootstrap',
        },
        ...[...plan.adminRoleUserIds, ...adoptedAdminRoleIds].map((userId) => ({
          userId,
          roleId: adminRole.id,
          assignedBy: 'bootstrap',
        })),
      ],
      skipDuplicates: true,
    });
  });
  console.log('Bootstrap complete.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof BootstrapError ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

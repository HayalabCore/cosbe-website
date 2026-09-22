/**
 * Local test databases only: make a Supabase Auth user super-admin, so a fresh
 * local database works right after sign-in. Refuses any non-localhost DB.
 *
 * Usage (DATABASE_URL on the command line wins over .env):
 *   DATABASE_URL='postgresql://postgres:postgres@localhost:55432/cosbe_test?schema=public' yarn db:local-super-admin [email]
 * Email defaults to BOOTSTRAP_SUPER_ADMIN_EMAIL. Needs NEXT_PUBLIC_SUPABASE_URL
 * and SUPABASE_SERVICE_ROLE_KEY (from .env) to look up the user's auth id.
 */

import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import { listAuthUsers } from '../src/lib/supabase/admin-core';
import { BOOTSTRAP_SUPER_ADMIN_EMAIL } from '../src/lib/admin-bootstrap-plan';
import { isLocalDatabaseUrl } from '../src/lib/local-db-guard';
import { SUPER_ADMIN_ROLE_KEY } from '../src/lib/permissions';

async function main() {
  loadEnvConfig(process.cwd());
  if (!isLocalDatabaseUrl(process.env.DATABASE_URL)) {
    throw new Error(
      'Refusing: DATABASE_URL is not a localhost database. Pass the local test DB URL on the command line.'
    );
  }

  const email = (process.argv[2] ?? BOOTSTRAP_SUPER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const authUser = (await listAuthUsers()).find(
    (u) => u.email?.toLowerCase() === email
  );
  if (!authUser) {
    throw new Error(`No Supabase Auth user with email ${email}.`);
  }

  const role = await prisma.role.findUnique({
    where: { key: SUPER_ADMIN_ROLE_KEY },
  });
  if (!role) {
    throw new Error(
      'Roles are missing. Run `yarn prisma migrate deploy` first.'
    );
  }

  await prisma.adminUser.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: authUser.id, roleId: role.id } },
    create: {
      userId: authUser.id,
      roleId: role.id,
      assignedBy: 'local-script',
    },
    update: {},
  });
  console.log(`${email} is super-admin in the local database.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

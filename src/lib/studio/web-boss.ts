import 'server-only';

import { PgBoss } from 'pg-boss';

const globalForBoss = globalThis as unknown as {
  studioWebBoss?: Promise<PgBoss>;
};

/**
 * The web app only sends jobs, and each send runs inside the caller's Prisma
 * transaction (`db: fromPrisma(tx)` in createAndEnqueueRun). This instance's
 * own pool (one connection, closed when idle) only serves pg-boss's startup
 * check and its queue cache: Prisma's raw queries cannot return the regclass
 * and bigint columns those read. It never installs or migrates the pg-boss
 * schema (the worker does) and runs no maintenance or cron.
 */
export function getWebBoss(): Promise<PgBoss> {
  globalForBoss.studioWebBoss ??= startWebBoss().catch((error) => {
    globalForBoss.studioWebBoss = undefined;
    throw error;
  });
  return globalForBoss.studioWebBoss;
}

/**
 * DIRECT_URL is the session pooler pg-boss is built for. Falling back to the
 * transaction pooler (DATABASE_URL) is untested, so it is loud about it.
 */
export function webBossConnectionString(
  env: Record<string, string | undefined> = process.env
): string {
  if (env.DIRECT_URL) return env.DIRECT_URL;
  if (!env.DATABASE_URL) {
    throw new Error(
      'DIRECT_URL (or DATABASE_URL) must be set to enqueue studio jobs'
    );
  }
  console.warn(
    '[studio web boss] DIRECT_URL is not set; using DATABASE_URL (transaction pooler). Set DIRECT_URL in App Hosting.'
  );
  return env.DATABASE_URL;
}

async function startWebBoss(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: webBossConnectionString(),
    max: 1,
    application_name: 'cosbe-web-studio',
    supervise: false,
    schedule: false,
    migrate: false,
    createSchema: false,
  });
  boss.on('error', (error) => console.error('[studio web boss]', error));
  await boss.start();
  return boss;
}

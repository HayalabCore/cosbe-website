import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

/** process.env, or a plain map in tests. */
export type EnvMap = Record<string, string | undefined>;

/**
 * Which env files a command reads. It never changes how the app behaves, and
 * deployed services need no files: their platform variables are already set
 * and always win. See env/README.md.
 */
export const APP_ENVS = ['local', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Highest priority first, as Next orders its own files. */
const FILES: Record<AppEnv, string[]> = {
  local: ['.env.development.local', '.env.local', '.env.development'],
  test: ['.env.test'],
  // Not `.env.production`: Next loads that name on every `next build`.
  staging: ['env/staging.env'],
  production: ['env/production.env'],
};

const REMOTE: readonly AppEnv[] = ['staging', 'production'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isRemoteAppEnv(appEnv: AppEnv): boolean {
  return REMOTE.includes(appEnv);
}

function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function parseAppEnv(value: string | undefined): AppEnv {
  if (!value) return 'local';
  if ((APP_ENVS as readonly string[]).includes(value)) return value as AppEnv;
  throw new Error(
    `APP_ENV must be one of ${APP_ENVS.join(', ')} (got "${value}").`
  );
}

export function loadAppEnv({
  cwd = process.cwd(),
  env = process.env,
}: { cwd?: string; env?: EnvMap } = {}): {
  appEnv: AppEnv;
  files: string[];
} {
  const appEnv = parseAppEnv(env.APP_ENV);
  const files: string[] = [];
  for (const name of FILES[appEnv]) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    const values = parseEnv(readFileSync(path, 'utf8'));
    for (const [key, value] of Object.entries(values)) {
      if (env[key] === undefined) env[key] = value;
    }
    files.push(name);
  }

  if (isRemoteAppEnv(appEnv)) {
    // Never fall back to local values when a remote target was chosen.
    if (files.length === 0)
      throw new Error(
        `APP_ENV=${appEnv} needs ${FILES[appEnv][0]}. See env/README.md.`
      );
    if (!env.DATABASE_URL)
      throw new Error(`DATABASE_URL is empty in ${FILES[appEnv][0]}.`);
    console.log(`[env] APP_ENV=${appEnv} (${files.join(', ')})`);
  }

  // A local Postgres has no pooler, so one URL serves both. On Supabase the
  // session URL must be set explicitly: the transaction pooler breaks
  // migrations and pg-boss, so it is never used as a silent fallback.
  if (!env.DIRECT_URL && env.DATABASE_URL && isLocalUrl(env.DATABASE_URL)) {
    env.DIRECT_URL = env.DATABASE_URL;
  }
  return { appEnv, files };
}

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAppEnv, type EnvMap } from './load-env';

let cwd: string;
const write = (name: string, body: string) => {
  mkdirSync(join(cwd, name, '..'), { recursive: true });
  writeFileSync(join(cwd, name), body);
};

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'env-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('loadAppEnv', () => {
  it('defaults to local and reads .env.local', () => {
    write('.env.local', 'DATABASE_URL=postgresql://localhost:55432/dev\nOPENAI_API_KEY=k');
    const env: EnvMap = {};
    expect(loadAppEnv({ cwd, env })).toEqual({ appEnv: 'local', files: ['.env.local'] });
    expect(env.OPENAI_API_KEY).toBe('k');
  });

  it('lets the first file win, and never overrides a value already set', () => {
    write('.env.development.local', 'A=first');
    write('.env.local', 'A=second\nB=local');
    write('.env.development', 'B=dev\nC=dev');
    const env: EnvMap = { C: 'shell' };
    loadAppEnv({ cwd, env });
    expect(env).toMatchObject({ A: 'first', B: 'local', C: 'shell' });
  });

  it('is fine with no files at all (deployed services)', () => {
    const env: EnvMap = { DATABASE_URL: 'postgresql://db.supabase.co:6543/x' };
    expect(loadAppEnv({ cwd, env }).files).toEqual([]);
    expect(env.DIRECT_URL).toBeUndefined();
  });

  it('defaults DIRECT_URL to DATABASE_URL only for a local database', () => {
    write('.env.local', 'DATABASE_URL=postgresql://postgres@localhost:55432/dev');
    const env: EnvMap = {};
    loadAppEnv({ cwd, env });
    expect(env.DIRECT_URL).toBe(env.DATABASE_URL);
  });

  it('uses only env/<name>.env for a remote environment, never local files', () => {
    write('.env.local', 'DATABASE_URL=postgresql://localhost/dev\nONLY_LOCAL=1');
    write('env/production.env', 'DATABASE_URL=postgresql://prod.pooler.supabase.com:6543/p\nDIRECT_URL=postgresql://prod.pooler.supabase.com:5432/p');
    const env: EnvMap = { APP_ENV: 'production' };
    expect(loadAppEnv({ cwd, env })).toEqual({ appEnv: 'production', files: ['env/production.env'] });
    expect(env.DATABASE_URL).toContain('prod');
    expect(env.ONLY_LOCAL).toBeUndefined();
  });

  it('stops when a chosen remote environment has no file or no database', () => {
    expect(() => loadAppEnv({ cwd, env: { APP_ENV: 'staging' } })).toThrow(/env\/staging\.env/);
    write('env/staging.env', 'DATABASE_URL=');
    expect(() => loadAppEnv({ cwd, env: { APP_ENV: 'staging' } })).toThrow(/DATABASE_URL/);
  });

  it('reads .env.test for tests', () => {
    write('.env.test', 'ADMIN_TEST_DB=1');
    const env: EnvMap = { APP_ENV: 'test' };
    loadAppEnv({ cwd, env });
    expect(env.ADMIN_TEST_DB).toBe('1');
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => loadAppEnv({ cwd, env: { APP_ENV: 'prod' } })).toThrow(/APP_ENV/);
  });
});

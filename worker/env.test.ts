import { describe, expect, it } from 'vitest';
import { loadWorkerEnv } from './env';

describe('loadWorkerEnv', () => {
  it('requires both database URLs and names the missing ones', () => {
    expect(() => loadWorkerEnv({})).toThrow(
      'Invalid worker environment: DATABASE_URL, DIRECT_URL, OPENAI_API_KEY'
    );
  });

  it('defaults PORT to 8080 and coerces it', () => {
    const base = {
      DATABASE_URL: 'postgres://localhost/a',
      DIRECT_URL: 'postgres://localhost/b',
      OPENAI_API_KEY: 'sk-test',
    };
    expect(loadWorkerEnv(base).PORT).toBe(8080);
    expect(loadWorkerEnv({ ...base, PORT: '9090' }).PORT).toBe(9090);
  });

  it('refuses a development worker on a remote database', () => {
    const remote = {
      DATABASE_URL: 'postgresql://u:p@aws-1.pooler.supabase.com:6543/db',
      DIRECT_URL: 'postgresql://u:p@aws-1.pooler.supabase.com:5432/db',
      OPENAI_API_KEY: 'sk-test',
    };
    expect(() => loadWorkerEnv(remote)).toThrow(/remote database/);
    expect(loadWorkerEnv({ ...remote, STUDIO_WORKER_ALLOW_REMOTE: '1' }).PORT).toBe(8080);
    expect(loadWorkerEnv({ ...remote, NODE_ENV: 'production' }).PORT).toBe(8080);
    expect(
      loadWorkerEnv({
        ...remote,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:55432/cosbe_test',
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:55432/cosbe_test',
      }).PORT
    ).toBe(8080);
  });

  it('also refuses when only the Prisma DATABASE_URL is remote', () => {
    expect(() =>
      loadWorkerEnv({
        DATABASE_URL: 'postgresql://u:p@aws-1.pooler.supabase.com:6543/db',
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:55432/cosbe_test',
        OPENAI_API_KEY: 'sk-test',
      })
    ).toThrow(/remote database/);
  });
});

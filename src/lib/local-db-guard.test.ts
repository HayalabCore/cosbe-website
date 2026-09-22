import { describe, expect, it } from 'vitest';
import { isLocalDatabaseUrl } from './local-db-guard';

describe('isLocalDatabaseUrl', () => {
  it.each([
    'postgresql://postgres:postgres@localhost:55432/cosbe_test?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/db',
    'postgres://u:p@[::1]:5432/db',
  ])('accepts %s', (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
  });

  it.each([
    'postgresql://postgres.abc:pw@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    'postgresql://u:p@db.example.com:5432/db',
    'postgresql://u:p@localhost.evil.com:5432/db',
    'not a url',
    '',
    undefined,
  ])('rejects %s', (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(false);
  });
});

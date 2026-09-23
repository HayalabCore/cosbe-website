import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const run = (appEnv: string) =>
  execFileSync(
    'node_modules/.bin/tsx',
    ['scripts/with-env.ts', 'node', '-e', 'console.log(process.env.DATABASE_URL)'],
    {
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', APP_ENV: appEnv },
    }
  );

describe('with-env', () => {
  it('starts the command with the files of APP_ENV loaded', () => {
    expect(run('test')).toContain('localhost:55432/cosbe_test');
  });
});

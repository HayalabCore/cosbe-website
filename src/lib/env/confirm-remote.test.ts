import { describe, expect, it, vi } from 'vitest';
import { confirmRemote } from './confirm-remote';

const env = { DATABASE_URL: 'postgresql://u:p@aws-1.pooler.supabase.com:6543/postgres' };

describe('confirmRemote', () => {
  it('does nothing for local work', async () => {
    const ask = vi.fn();
    await confirmRemote('local', { ask, env, argv: [] });
    expect(ask).not.toHaveBeenCalled();
  });

  it('asks for the environment name and shows the target host', async () => {
    const ask = vi.fn(async () => 'production');
    await confirmRemote('production', { ask, env, argv: [] });
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('aws-1.pooler.supabase.com'));
  });

  it('refuses a wrong answer', async () => {
    await expect(
      confirmRemote('production', { ask: async () => 'y', env, argv: [] })
    ).rejects.toThrow(/Cancelled/);
  });

  it('skips the question with --yes (CI)', async () => {
    const ask = vi.fn();
    await confirmRemote('staging', { ask, env, argv: ['--yes'] });
    expect(ask).not.toHaveBeenCalled();
  });
});

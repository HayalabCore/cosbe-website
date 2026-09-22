import { describe, expect, it } from 'vitest';
import { loadWorkerEnv } from './env';

describe('loadWorkerEnv', () => {
  it('requires both database URLs and names the missing ones', () => {
    expect(() => loadWorkerEnv({})).toThrow(
      'Invalid worker environment: DATABASE_URL, DIRECT_URL'
    );
  });

  it('defaults PORT to 8080 and coerces it', () => {
    const base = { DATABASE_URL: 'postgres://a', DIRECT_URL: 'postgres://b' };
    expect(loadWorkerEnv(base).PORT).toBe(8080);
    expect(loadWorkerEnv({ ...base, PORT: '9090' }).PORT).toBe(9090);
  });
});

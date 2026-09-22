import { afterEach, describe, expect, it, vi } from 'vitest';
import { webBossConnectionString } from './web-boss';

describe('webBossConnectionString', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses DIRECT_URL (session pooler) when set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      webBossConnectionString({
        DIRECT_URL: 'postgres://session',
        DATABASE_URL: 'postgres://pooled',
      })
    ).toBe('postgres://session');
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to DATABASE_URL with a warning when DIRECT_URL is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(webBossConnectionString({ DATABASE_URL: 'postgres://pooled' })).toBe(
      'postgres://pooled'
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('DIRECT_URL is not set')
    );
  });

  it('throws when neither URL is set', () => {
    expect(() => webBossConnectionString({})).toThrow(
      'DIRECT_URL (or DATABASE_URL) must be set'
    );
  });
});

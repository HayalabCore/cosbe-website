import { describe, expect, it } from 'vitest';

import {
  assertPublicHttpUrl,
  assertRedirectTargetAllowed,
  BlockedUrlError,
  isBlockedIp,
  isBlockedIPv4,
  isBlockedIPv6,
} from '@/lib/legacy-import/url-guard';

describe('isBlockedIPv4', () => {
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '10.255.255.255',
    '100.64.0.1', // CGNAT
    '127.0.0.1',
    '169.254.169.254', // cloud metadata
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '192.0.2.5', // TEST-NET-1
    '255.255.255.255',
  ])('blocks private/reserved %s', (ip) => {
    expect(isBlockedIPv4(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '203.0.114.1', '172.32.0.1', '11.0.0.1'])(
    'allows public %s',
    (ip) => {
      expect(isBlockedIPv4(ip)).toBe(false);
    }
  );

  it('blocks the 172.16/12 boundary but allows just outside it', () => {
    expect(isBlockedIPv4('172.15.255.255')).toBe(false);
    expect(isBlockedIPv4('172.16.0.0')).toBe(true);
    expect(isBlockedIPv4('172.31.255.255')).toBe(true);
    expect(isBlockedIPv4('172.32.0.0')).toBe(false);
  });
});

describe('isBlockedIPv6', () => {
  it.each(['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1'])(
    'blocks %s',
    (ip) => {
      expect(isBlockedIPv6(ip)).toBe(true);
    }
  );

  it('classifies IPv4-mapped addresses by their embedded v4', () => {
    expect(isBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIPv6('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIPv6('::ffff:8.8.8.8')).toBe(false);
  });

  it('allows public global-unicast addresses', () => {
    expect(isBlockedIPv6('2606:4700:4700::1111')).toBe(false);
  });
});

describe('isBlockedIp', () => {
  it('blocks anything that is not a recognizable IP', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });
  it('dispatches to the right family', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
  });
});

describe('assertPublicHttpUrl (literal hosts — no DNS)', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(
      assertPublicHttpUrl('file:///etc/passwd')
    ).rejects.toBeInstanceOf(BlockedUrlError);
    await expect(
      assertPublicHttpUrl('ftp://example.com/x')
    ).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it('rejects embedded credentials', async () => {
    await expect(
      assertPublicHttpUrl('http://user:pass@8.8.8.8/')
    ).rejects.toBeInstanceOf(BlockedUrlError);
  });

  it('rejects the cloud metadata IP and loopback', async () => {
    await expect(
      assertPublicHttpUrl('http://169.254.169.254/latest/meta-data/')
    ).rejects.toBeInstanceOf(BlockedUrlError);
    await expect(
      assertPublicHttpUrl('http://127.0.0.1:8080/')
    ).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://[::1]/')).rejects.toThrow();
  });

  it('rejects a malformed URL', async () => {
    await expect(assertPublicHttpUrl('http://')).rejects.toBeInstanceOf(
      BlockedUrlError
    );
  });

  it('allows a public IP literal over https', async () => {
    const url = await assertPublicHttpUrl('https://8.8.8.8/logo.png');
    expect(url.hostname).toBe('8.8.8.8');
  });
});

describe('assertRedirectTargetAllowed', () => {
  it('throws on a literal private redirect target', () => {
    expect(() => assertRedirectTargetAllowed('169.254.169.254')).toThrow(
      BlockedUrlError
    );
    expect(() => assertRedirectTargetAllowed('[::1]')).toThrow(BlockedUrlError);
  });

  it('permits a literal public target', () => {
    expect(() => assertRedirectTargetAllowed('8.8.8.8')).not.toThrow();
  });

  it('permits hostnames (DNS re-checked elsewhere)', () => {
    expect(() => assertRedirectTargetAllowed('cdn.example.com')).not.toThrow();
  });
});

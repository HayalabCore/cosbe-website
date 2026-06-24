import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF guard for server-side image fetching during legacy imports.
 *
 * Image URLs originate from scraped third-party HTML and from the client-supplied
 * commit payload, so they are attacker-influenced. Before fetching, we reject
 * non-http(s) schemes, embedded credentials, and any host that is — or resolves
 * to — a private/reserved/loopback/link-local address (notably the cloud metadata
 * endpoint 169.254.169.254).
 *
 * Known residual: a redirect from a public host to a private one is only checked
 * against literal IPs at redirect time (see `assertRedirectTargetAllowed`); full
 * DNS re-resolution per hop / rebinding hardening is a follow-up.
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    acc = acc * 256 + n;
  }
  return acc >>> 0;
}

// [network, prefix-length] of ranges that must never be fetched.
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // RFC1918 private
  ['100.64.0.0', 10], // RFC6598 CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + cloud metadata
  ['172.16.0.0', 12], // RFC1918 private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // RFC1918 private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved / 255.255.255.255 broadcast
];

export function isBlockedIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // unparseable → block
  for (const [network, bits] of BLOCKED_V4) {
    const base = ipv4ToInt(network)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) === (base & mask)) return true;
  }
  return false;
}

export function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().split('%')[0]!; // strip zone id
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible → classify the embedded v4.
  const mapped = lower.match(/(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && lower.includes('.')) return isBlockedIPv4(mapped[1]!);
  const firstHextet = lower.split(':')[0] ?? '';
  // fc00::/7 unique-local (fc.. / fd..)
  if (/^f[cd]/.test(firstHextet)) return true;
  // fe80::/10 link-local
  if (/^fe[89ab]/.test(firstHextet)) return true;
  return false;
}

/** True if an IP literal points at a private/reserved/loopback destination. */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIPv4(ip);
  if (net.isIPv6(ip)) return isBlockedIPv6(ip);
  return true; // not a recognizable IP → block
}

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

/**
 * Validates a URL for safe server-side fetching, resolving DNS to reject hosts
 * that map to private/reserved addresses. Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BlockedUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError(`Disallowed URL scheme: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new BlockedUrlError('URLs with embedded credentials are not allowed');
  }

  const host = url.hostname.replace(/^\[/, '').replace(/\]$/, '');

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new BlockedUrlError(`Blocked private/reserved address: ${host}`);
    }
    return url;
  }

  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new BlockedUrlError(`Could not resolve host: ${host}`);
  }
  if (!records.length) {
    throw new BlockedUrlError(`Could not resolve host: ${host}`);
  }
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new BlockedUrlError(
        `Host ${host} resolves to a blocked address (${address})`
      );
    }
  }
  return url;
}

/**
 * Synchronous best-effort check for redirect targets (used in an axios
 * `beforeRedirect` hook, which cannot await DNS). Blocks redirects to literal
 * private/reserved IPs.
 */
export function assertRedirectTargetAllowed(host: string): void {
  const h = host.replace(/^\[/, '').replace(/\]$/, '');
  if (net.isIP(h) && isBlockedIp(h)) {
    throw new BlockedUrlError(
      `Blocked redirect to private/reserved host: ${h}`
    );
  }
}

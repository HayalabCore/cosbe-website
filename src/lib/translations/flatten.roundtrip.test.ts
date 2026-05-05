/**
 * Round-trip verification: messages JSON ↔ flatten ↔ unflatten.
 * Run: yarn test:translations-flatten
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { flattenMessages, unflattenMessages } from './flatten';

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao).sort();
    const bk = Object.keys(bo).sort();
    if (ak.length !== bk.length) return false;
    if (!ak.every((k, i) => k === bk[i])) return false;
    return ak.every((k) => deepEqual(ao[k], bo[k]));
  }
  return false;
}

function roundTrip(label: string, jsonPath: string) {
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const flat = flattenMessages(parsed);
  const back = unflattenMessages(flat);
  assert.ok(
    deepEqual(parsed, back),
    `${label}: round-trip mismatch (check flatten/unflatten for ${jsonPath})`
  );
  console.log(`${label}: OK (${flat.length} leaf strings)`);
}

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..', '..');
roundTrip('JA', join(root, 'messages', 'ja.json'));
roundTrip('EN', join(root, 'messages', 'en.json'));

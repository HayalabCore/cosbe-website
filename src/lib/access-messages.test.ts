import { describe, expect, it } from 'vitest';
import adminEn from '../../messages/admin-en.json';
import adminJa from '../../messages/admin-ja.json';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  permissionMessageKey,
} from './permissions';
import { ACCESS_ERROR_CODES } from './access-types';

type Tree = Record<string, unknown>;

function at(tree: Tree, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

describe.each([
  ['en', adminEn],
  ['ja', adminJa],
])('admin-%s access copy', (_locale, messages) => {
  it.each(ALL_PERMISSIONS)('has label and description for %s', (p) => {
    const key = permissionMessageKey(p);
    expect(typeof at(messages, `access.permissions.${key}.label`)).toBe(
      'string'
    );
    expect(typeof at(messages, `access.permissions.${key}.description`)).toBe(
      'string'
    );
  });

  it('has every group and error code', () => {
    for (const g of PERMISSION_GROUPS) {
      expect(typeof at(messages, `access.groups.${g}`)).toBe('string');
    }
    for (const code of ACCESS_ERROR_CODES) {
      expect(typeof at(messages, `access.errors.${code}`)).toBe('string');
    }
  });
});

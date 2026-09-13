import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  createRoleSchema,
  createUserSchema,
  updateRoleSchema,
} from './access';

describe('access validation', () => {
  it('requires current and new passwords for a change', () => {
    expect(
      changePasswordSchema.safeParse({ password: 'a-long-password' }).success
    ).toBe(false);
    expect(
      changePasswordSchema.parse({
        currentPassword: 'short-old',
        password: 'a-long-password',
      })
    ).toEqual({
      currentPassword: 'short-old',
      password: 'a-long-password',
    });
  });

  it('normalizes a new user', () => {
    const roleId = randomUUID();
    const parsed = createUserSchema.parse({
      email: '  New.User@CosBE.inc ',
      displayName: '  ',
      password: 'a-long-password',
      roleIds: [roleId, roleId],
    });
    expect(parsed).toEqual({
      email: 'new.user@cosbe.inc',
      displayName: null,
      password: 'a-long-password',
      roleIds: [roleId],
    });
  });

  it('rejects short passwords and bad emails', () => {
    expect(
      createUserSchema.safeParse({
        email: 'nope',
        password: 'short',
        roleIds: [],
      }).success
    ).toBe(false);
  });

  it('role keys are kebab-case and cannot be super-admin', () => {
    const base = { name: 'X', permissions: [] };
    expect(
      createRoleSchema.safeParse({ ...base, key: 'content-editor' }).success
    ).toBe(true);
    expect(
      createRoleSchema.safeParse({ ...base, key: 'Content Editor' }).success
    ).toBe(false);
    expect(
      createRoleSchema.safeParse({ ...base, key: 'super-admin' }).success
    ).toBe(false);
  });

  it('rejects unknown permissions and dedupes known ones', () => {
    const roleId = randomUUID();
    expect(
      updateRoleSchema.safeParse({
        roleId,
        name: 'X',
        permissions: ['articles.fly'],
      }).success
    ).toBe(false);
    expect(
      updateRoleSchema.parse({
        roleId,
        name: ' X ',
        permissions: ['media.upload', 'media.upload'],
      })
    ).toEqual({
      roleId,
      name: 'X',
      description: null,
      permissions: ['media.upload'],
    });
  });
});

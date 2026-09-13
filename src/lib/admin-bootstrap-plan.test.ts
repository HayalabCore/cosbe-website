import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_SUPER_ADMIN_EMAIL,
  BootstrapError,
  parseBootstrapArgs,
  planBootstrap,
} from './admin-bootstrap-plan';

const auth = (id: string, email: string | null, banned = false) => ({
  id,
  email,
  lastSignInAt: null,
  banned,
});

describe('planBootstrap', () => {
  const authUsers = [
    auth('me', 'Bivav.R.S@cosbe.inc'),
    auth('a', 'a@cosbe.inc'),
    auth('b', 'b@cosbe.inc', true),
    auth('c', 'c@cosbe.inc'),
    auth('phone', null),
  ];

  it('creates missing rows, mirrors bans, and assigns roles', () => {
    const plan = planBootstrap({
      authUsers,
      existingUserIds: new Set(['c']),
      userIdsWithRoles: new Set(['c']),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.newRows).toEqual([
      { id: 'me', email: 'bivav.r.s@cosbe.inc', disabled: false },
      { id: 'a', email: 'a@cosbe.inc', disabled: false },
      { id: 'b', email: 'b@cosbe.inc', disabled: true },
    ]);
    expect(plan.superAdminUserId).toBe('me');
    expect(plan.superAdminBanned).toBe(false);
    // c already has roles; the super-admin is not also made Admin.
    expect(plan.adminRoleUserIds).toEqual(['a', 'b']);
    expect(plan.skippedWithoutEmail).toEqual(['phone']);
    expect(plan.emailClashes).toEqual([]);
  });

  it('gives Admin to existing rows that have no roles (auto-provisioned)', () => {
    const plan = planBootstrap({
      authUsers,
      existingUserIds: new Set(['a']),
      userIdsWithRoles: new Set(),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.newRows.map((r) => r.id)).not.toContain('a');
    expect(plan.adminRoleUserIds).toContain('a');
  });

  it('excludes email clashes from new rows and Admin grants', () => {
    const plan = planBootstrap({
      authUsers: [
        auth('me', 'bivav.r.s@cosbe.inc'),
        auth('new-id', 'taken@cosbe.inc'),
      ],
      existingUserIds: new Set(['old-id']),
      existingEmailToId: new Map([['taken@cosbe.inc', 'old-id']]),
      userIdsWithRoles: new Set(['old-id']),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.newRows.map((r) => r.id)).toEqual(['me']);
    expect(plan.adminRoleUserIds).not.toContain('new-id');
    expect(plan.emailClashes).toEqual([
      {
        id: 'new-id',
        email: 'taken@cosbe.inc',
        existingId: 'old-id',
        existingHasRoles: true,
      },
    ]);
  });

  it('marks a banned super-admin', () => {
    const plan = planBootstrap({
      authUsers: [auth('me', 'bivav.r.s@cosbe.inc', true)],
      existingUserIds: new Set(),
      userIdsWithRoles: new Set(),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.superAdminBanned).toBe(true);
  });

  it('matches existing emails case-insensitively', () => {
    const plan = planBootstrap({
      authUsers: [
        auth('me', 'bivav.r.s@cosbe.inc'),
        auth('new-id', 'Taken@cosbe.inc'),
      ],
      existingUserIds: new Set(['old-id']),
      existingEmailToId: new Map([['TAKEN@cosbe.inc', 'old-id']]),
      userIdsWithRoles: new Set(['old-id']),
      superAdminEmail: 'bivav.r.s@cosbe.inc',
    });
    expect(plan.emailClashes).toEqual([
      {
        id: 'new-id',
        email: 'taken@cosbe.inc',
        existingId: 'old-id',
        existingHasRoles: true,
      },
    ]);
  });

  it('parseBootstrapArgs requires a value after --super-admin', () => {
    expect(() => parseBootstrapArgs(['--super-admin', '--dry-run'])).toThrow(
      BootstrapError
    );
    expect(
      parseBootstrapArgs(['--super-admin', 'Other@cosbe.inc', '--force'])
    ).toEqual({
      dryRun: false,
      force: true,
      superAdminEmail: 'other@cosbe.inc',
    });
    expect(parseBootstrapArgs(['--dry-run'])).toEqual({
      dryRun: true,
      force: false,
      superAdminEmail: BOOTSTRAP_SUPER_ADMIN_EMAIL,
    });
  });

  it('aborts when the super-admin email is missing', () => {
    expect(() =>
      planBootstrap({
        authUsers: [auth('a', 'a@cosbe.inc')],
        existingUserIds: new Set(),
        userIdsWithRoles: new Set(),
        superAdminEmail: 'bivav.r.s@cosbe.inc',
      })
    ).toThrow(BootstrapError);
  });
});

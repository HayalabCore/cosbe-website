import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import type { ActorDTO, AdminUserRow, RoleRow } from '@/lib/access-types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

const actions = {
  createUserAction: vi.fn(),
  resetPasswordAction: vi.fn(),
  setUserRolesAction: vi.fn(),
  disableUserAction: vi.fn(),
  enableUserAction: vi.fn(),
  deleteUserAction: vi.fn(),
};
vi.mock('@/actions/users', () => ({
  createUserAction: (...a: unknown[]) => actions.createUserAction(...a),
  resetPasswordAction: (...a: unknown[]) => actions.resetPasswordAction(...a),
  setUserRolesAction: (...a: unknown[]) => actions.setUserRolesAction(...a),
  disableUserAction: (...a: unknown[]) => actions.disableUserAction(...a),
  enableUserAction: (...a: unknown[]) => actions.enableUserAction(...a),
  deleteUserAction: (...a: unknown[]) => actions.deleteUserAction(...a),
}));

import UsersClient from './UsersClient';

const roles: RoleRow[] = [
  {
    id: 'r-super',
    key: 'super-admin',
    name: 'Super-admin',
    description: null,
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  {
    id: 'r-admin',
    key: 'admin',
    name: 'Admin',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    userCount: 1,
  },
  {
    id: 'r-marketing',
    key: 'marketing',
    name: 'Marketing',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    userCount: 0,
  },
];

function row(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: 'x',
    email: 'x@test.local',
    displayName: null,
    disabled: false,
    mustChangePassword: false,
    isSuperAdmin: false,
    roleIds: [],
    permissions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSignInAt: null,
    ...overrides,
  };
}

const me = row({
  id: 'me',
  email: 'me@test.local',
  isSuperAdmin: true,
  roleIds: ['r-super'],
  permissions: ALL_PERMISSIONS,
});
const boss = row({
  id: 'boss',
  email: 'boss@test.local',
  isSuperAdmin: true,
  roleIds: ['r-super'],
  permissions: ALL_PERMISSIONS,
});
const writer = row({
  id: 'writer',
  email: 'writer@test.local',
  roleIds: ['r-marketing'],
  permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
});
const gone = row({
  id: 'gone',
  email: 'gone@test.local',
  disabled: true,
});

const superActor: ActorDTO = {
  userId: 'me',
  permissions: ALL_PERMISSIONS,
  isSuperAdmin: true,
};
const adminActor: ActorDTO = {
  userId: 'me',
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  isSuperAdmin: false,
};

function rowFor(email: string) {
  return screen.getByText(email).closest('tr') as HTMLElement;
}

describe('UsersClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows no actions on your own row', () => {
    renderAdmin(
      <UsersClient users={[me, writer]} roles={roles} actor={superActor} />
    );
    const mine = rowFor('me@test.local');
    expect(within(mine).getByText('You')).toBeInTheDocument();
    expect(within(mine).queryAllByRole('button')).toHaveLength(0);
    expect(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Disable',
      })
    ).toBeInTheDocument();
  });

  it('admins get no actions on super-admin rows and no Delete at all', () => {
    renderAdmin(
      <UsersClient users={[me, boss, gone]} roles={roles} actor={adminActor} />
    );
    expect(
      within(rowFor('boss@test.local')).queryAllByRole('button')
    ).toHaveLength(0);
    const goneRow = rowFor('gone@test.local');
    expect(
      within(goneRow).getByRole('button', { name: 'Enable' })
    ).toBeInTheDocument();
    expect(
      within(goneRow).queryByRole('button', { name: 'Delete' })
    ).toBeNull();
  });

  it('super-admins can delete disabled users only', () => {
    renderAdmin(
      <UsersClient
        users={[me, writer, gone]}
        roles={roles}
        actor={superActor}
      />
    );
    expect(
      within(rowFor('writer@test.local')).queryByRole('button', {
        name: 'Delete',
      })
    ).toBeNull();
    expect(
      within(rowFor('gone@test.local')).getByRole('button', {
        name: 'Delete',
      })
    ).toBeInTheDocument();
  });

  it('creates a user and shows the credentials once', async () => {
    actions.createUserAction.mockResolvedValue({
      ok: true,
      data: { id: 'new', email: 'new@test.local' },
    });
    const user = userEvent.setup();
    renderAdmin(<UsersClient users={[me]} roles={roles} actor={adminActor} />);
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Super-admin')).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Email'), 'new@test.local');
    await user.click(within(dialog).getByLabelText('Marketing'));
    const password = (
      within(dialog).getByLabelText('Temporary password') as HTMLInputElement
    ).value;
    expect(password).toHaveLength(16);
    await user.click(
      within(dialog).getByRole('button', { name: 'Create user' })
    );
    await waitFor(() =>
      expect(actions.createUserAction).toHaveBeenCalledWith({
        email: 'new@test.local',
        displayName: '',
        password,
        roleIds: ['r-marketing'],
      })
    );
    expect(
      await screen.findByText('Share these credentials')
    ).toBeInTheDocument();
    expect(screen.getByText(password)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    const createdRow = screen
      .getAllByText('new@test.local')
      .find((el) => el.closest('tr'))
      ?.closest('tr');
    expect(createdRow).toBeTruthy();
    expect(within(createdRow as HTMLElement).getByText('Marketing')).toBeInTheDocument();
  });

  it('only the user being disabled shows Saving', async () => {
    actions.disableUserAction.mockImplementation(() => new Promise(() => {}));
    const other = row({
      id: 'other',
      email: 'other@test.local',
      roleIds: ['r-marketing'],
      permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient
        users={[me, writer, other]}
        roles={roles}
        actor={superActor}
      />
    );
    await user.click(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Disable',
      })
    );
    await waitFor(() =>
      expect(
        within(rowFor('writer@test.local')).getByRole('button', {
          name: 'Saving…',
        })
      ).toBeInTheDocument()
    );
    expect(
      within(rowFor('other@test.local')).getByRole('button', {
        name: 'Disable',
      })
    ).toBeInTheDocument();
    await user.click(
      within(rowFor('other@test.local')).getByRole('button', {
        name: 'Edit roles',
      })
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).queryByRole('button', {
        name: 'Saving…',
      })
    ).toBeNull();
  });

  it('shows translated errors from actions', async () => {
    actions.disableUserAction.mockResolvedValue({
      ok: false,
      error: 'BAN_FAILED',
    });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient users={[me, writer]} roles={roles} actor={superActor} />
    );
    await user.click(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Disable',
      })
    );
    expect(
      await screen.findByText(
        'Access was disabled here, but blocking sign-in in Supabase failed. Try again.'
      )
    ).toBeInTheDocument();
  });

  it('hides actions on a user who holds permissions the actor lacks', () => {
    const hrActor: ActorDTO = {
      userId: 'me',
      permissions: ['users.view', 'users.create', 'users.disable'],
      isSuperAdmin: false,
    };
    const adminUser = row({
      id: 'admin-user',
      email: 'admin@test.local',
      roleIds: ['r-admin'],
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    });
    renderAdmin(
      <UsersClient
        users={[row({ id: 'me', email: 'me@test.local' }), adminUser]}
        roles={roles}
        actor={hrActor}
      />
    );
    expect(
      within(rowFor('admin@test.local')).queryAllByRole('button')
    ).toHaveLength(0);
  });

  it('shows the new roles as soon as save succeeds, before refresh', async () => {
    actions.setUserRolesAction.mockResolvedValue({
      ok: true,
      data: undefined,
    });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient users={[me, writer]} roles={roles} actor={superActor} />
    );
    expect(
      within(rowFor('writer@test.local')).getByText('Marketing')
    ).toBeInTheDocument();
    await user.click(
      within(rowFor('writer@test.local')).getByRole('button', {
        name: 'Edit roles',
      })
    );
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByLabelText('Admin'));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(actions.setUserRolesAction).toHaveBeenCalledWith({
        userId: 'writer',
        roleIds: ['r-marketing', 'r-admin'],
      })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    const writerRow = rowFor('writer@test.local');
    expect(within(writerRow).getByText('Admin')).toBeInTheDocument();
    expect(within(writerRow).getByText('Marketing')).toBeInTheDocument();
  });

  it('delete requires typing the email', async () => {
    actions.deleteUserAction.mockResolvedValue({
      ok: true,
      data: undefined,
    });
    const user = userEvent.setup();
    renderAdmin(
      <UsersClient users={[me, gone]} roles={roles} actor={superActor} />
    );
    await user.click(
      within(rowFor('gone@test.local')).getByRole('button', {
        name: 'Delete',
      })
    );
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete permanently',
    });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox'), 'gone@test.local');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() =>
      expect(actions.deleteUserAction).toHaveBeenCalledWith({
        userId: 'gone',
      })
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import type { ActorDTO, RoleRow } from '@/lib/access-types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

const createRoleAction = vi.fn();
const updateRoleAction = vi.fn();
const deleteRoleAction = vi.fn();
vi.mock('@/actions/roles', () => ({
  createRoleAction: (...a: unknown[]) => createRoleAction(...a),
  updateRoleAction: (...a: unknown[]) => updateRoleAction(...a),
  deleteRoleAction: (...a: unknown[]) => deleteRoleAction(...a),
}));

import RolesClient from './RolesClient';

const roles: RoleRow[] = [
  {
    id: 'r-super',
    key: 'super-admin',
    name: 'Super-admin',
    description: 'Everything',
    isSystem: true,
    permissions: [],
    userCount: 1,
  },
  {
    id: 'r-marketing',
    key: 'marketing',
    name: 'Marketing',
    description: null,
    isSystem: false,
    permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
    userCount: 3,
  },
];

const adminActor: ActorDTO = {
  userId: 'me',
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  isSuperAdmin: false,
};

function card(name: string) {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement;
}

describe('RolesClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows super-admin as locked with no edit or delete', () => {
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    const superCard = card('Super-admin');
    expect(within(superCard).getByText('Locked')).toBeInTheDocument();
    expect(within(superCard).getByText('All permissions')).toBeInTheDocument();
    expect(within(superCard).queryByRole('button')).toBeNull();
    expect(within(card('Marketing')).getByText('3 users')).toBeInTheDocument();
  });

  it('creates a role; permissions the actor lacks are disabled', async () => {
    createRoleAction.mockResolvedValue({ ok: true, data: { id: 'new' } });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(screen.getByRole('button', { name: 'New role' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('checkbox', { name: /Delete users/ })
    ).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Name'), 'Editor');
    await user.type(within(dialog).getByLabelText('Key'), 'editor');
    await user.click(
      within(dialog).getByRole('checkbox', { name: /Edit articles/ })
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() =>
      expect(createRoleAction).toHaveBeenCalledWith({
        key: 'editor',
        name: 'Editor',
        description: '',
        permissions: ['articles.edit'],
      })
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Editor' })
    ).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  it('edits a role without a key field', async () => {
    updateRoleAction.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Edit' })
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText('Key')).toBeNull();
    expect(
      within(dialog).getByRole('checkbox', { name: /Publish articles/ })
    ).toBeChecked();
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Growth');
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() =>
      expect(updateRoleAction).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'r-marketing', name: 'Growth' })
      )
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Growth' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Marketing' })
    ).toBeNull();
  });

  it('only the role being deleted shows Saving', async () => {
    deleteRoleAction.mockImplementation(() => new Promise(() => {}));
    const extra: RoleRow = {
      id: 'r-editor',
      key: 'editor',
      name: 'Editor',
      description: null,
      isSystem: false,
      permissions: DEFAULT_ROLE_PERMISSIONS.marketing,
      userCount: 0,
    };
    const user = userEvent.setup();
    renderAdmin(
      <RolesClient roles={[...roles, extra]} actor={adminActor} />
    );
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Delete' })
    );
    await waitFor(() =>
      expect(
        within(card('Marketing')).getByRole('button', { name: 'Saving…' })
      ).toBeInTheDocument()
    );
    expect(
      within(card('Editor')).getByRole('button', { name: 'Delete' })
    ).toBeInTheDocument();
    expect(
      within(card('Editor')).queryByRole('button', { name: 'Saving…' })
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'New role' }));
    expect(
      screen.getByRole('button', { name: 'Save role' })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).queryByRole('button', {
        name: 'Saving…',
      })
    ).toBeNull();
  });

  it('removes the card as soon as delete succeeds', async () => {
    deleteRoleAction.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Delete' })
    );
    await waitFor(() =>
      expect(deleteRoleAction).toHaveBeenCalledWith({ roleId: 'r-marketing' })
    );
    expect(
      screen.queryByRole('heading', { name: 'Marketing' })
    ).toBeNull();
  });

  it('confirms before deleting and shows translated errors', async () => {
    deleteRoleAction.mockResolvedValue({ ok: false, error: 'FORBIDDEN' });
    const user = userEvent.setup();
    renderAdmin(<RolesClient roles={roles} actor={adminActor} />);
    await user.click(
      within(card('Marketing')).getByRole('button', { name: 'Delete' })
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete the role “Marketing”? It will be removed from 3 users.'
    );
    expect(
      await screen.findByText('You don’t have permission to do that.')
    ).toBeInTheDocument();
  });
});

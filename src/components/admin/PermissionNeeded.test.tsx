import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdmin } from '@/test/render-admin';
import PermissionNeeded from './PermissionNeeded';
import { usePermissions } from './PermissionsContext';

function Probe() {
  const { can } = usePermissions();
  return <span>{can('users.delete') ? 'yes' : 'no'}</span>;
}

describe('PermissionNeeded', () => {
  it('names the missing permission', () => {
    renderAdmin(<PermissionNeeded permission="media.upload" />);
    expect(
      screen.getByRole('heading', { name: 'Permission needed' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Upload media/)).toBeInTheDocument();
  });

  it('renders Japanese copy', () => {
    renderAdmin(<PermissionNeeded permission="media.upload" />, {
      locale: 'ja',
    });
    expect(
      screen.getByRole('heading', { name: '権限が必要です' })
    ).toBeInTheDocument();
  });
});

describe('usePermissions', () => {
  it('reflects the provided permissions', () => {
    renderAdmin(<Probe />, { permissions: ['users.view'] });
    expect(screen.getByText('no')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdmin } from '@/test/render-admin';
import AdminBusyButton from './AdminBusyButton';

describe('AdminBusyButton', () => {
  it('shows the idle label when not busy', () => {
    renderAdmin(
      <AdminBusyButton idleLabel="Save" busyLabel="Saving…" busy={false} />
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('disables and shows the busy label', () => {
    renderAdmin(
      <AdminBusyButton idleLabel="Save" busyLabel="Saving…" busy />
    );
    const button = screen.getByRole('button', { name: 'Saving…' });
    expect(button).toBeDisabled();
  });
});

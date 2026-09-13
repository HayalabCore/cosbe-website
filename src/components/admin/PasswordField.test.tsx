import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import PasswordField from './PasswordField';

describe('PasswordField', () => {
  it('starts hidden and toggles visibility', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAdmin(
      <PasswordField
        id="password"
        label="Password"
        value="secret"
        onChange={onChange}
        autoComplete="current-password"
      />
    );

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Hide password' })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

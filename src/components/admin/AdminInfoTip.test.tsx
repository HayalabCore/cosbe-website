import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AdminInfoTip from './AdminInfoTip';

describe('AdminInfoTip', () => {
  it('explains on hover and hides again', async () => {
    render(
      <AdminInfoTip label="About Tone">How it should sound.</AdminInfoTip>
    );
    const button = screen.getByRole('button', { name: 'About Tone' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    await userEvent.hover(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'How it should sound.'
    );
    expect(button).toHaveAccessibleDescription('How it should sound.');
    await userEvent.unhover(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens from the keyboard and closes with Escape', async () => {
    render(
      <AdminInfoTip label="About Tone">How it should sound.</AdminInfoTip>
    );
    await userEvent.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('stays open when clicked, since hover and focus already opened it', async () => {
    render(
      <AdminInfoTip label="About Tone">How it should sound.</AdminInfoTip>
    );
    await userEvent.click(screen.getByRole('button', { name: 'About Tone' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import StageRail from './StageRail';

describe('StageRail', () => {
  it('marks done, current and future stages and lets you view past ones', async () => {
    const onView = vi.fn();
    renderAdmin(<StageRail stage="review" articleStatus={null} viewing="review" onView={onView} />);
    expect(screen.getByRole('button', { name: /Review/ })).toHaveAttribute('aria-current', 'step');
    await userEvent.click(screen.getByRole('button', { name: /Outline/ }));
    expect(onView).toHaveBeenCalledWith('outline');
    expect(screen.getByRole('button', { name: /Draft post/ })).toBeDisabled();
  });

  it('shows the tracked post status after handoff', () => {
    renderAdmin(<StageRail stage="handed_off" articleStatus="published" viewing="handed_off" onView={vi.fn()} />);
    expect(screen.getByText('Published', { selector: 'small' })).toBeInTheDocument();
  });
});

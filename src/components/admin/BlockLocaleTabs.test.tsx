import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdmin } from '@/test/render-admin';
import BlockLocaleTabs from './BlockLocaleTabs';

describe('BlockLocaleTabs', () => {
  it('keeps Generate English when a bulk translate is running', () => {
    renderAdmin(
      <BlockLocaleTabs
        tab="original"
        onTabChange={vi.fn()}
        onGenerateEnglish={vi.fn()}
        generating={false}
        bulkTranslating
      />
    );
    const button = screen.getByRole('button', { name: 'Generate English' });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Generating…' })).toBeNull();
  });

  it('shows Generating only for this control', () => {
    renderAdmin(
      <BlockLocaleTabs
        tab="original"
        onTabChange={vi.fn()}
        onGenerateEnglish={vi.fn()}
        generating
      />
    );
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled();
  });
});

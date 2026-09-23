import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/studio/templates',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/actions/studio-pieces', () => ({
  listPiecesAction: vi.fn(async () => ({ ok: true, data: [] })),
  createPieceAction: vi.fn(),
}));
vi.mock('@/actions/studio-projects', () => ({
  listProjectsAction: vi.fn(async () => ({ ok: true, data: [] })),
  createProjectAction: vi.fn(),
}));
vi.mock('@/actions/studio', () => ({
  startSystemCheckAction: vi.fn(),
  getRunStatusAction: vi.fn(),
}));

import StudioHome from './StudioHome';

describe('StudioHome', () => {
  it('shows the worker check only to people who operate the worker', () => {
    renderAdmin(<StudioHome>body</StudioHome>, {
      permissions: ['studio.use', 'studio.templates.manage'],
    });
    expect(screen.queryByRole('button', { name: 'Check worker' })).toBeNull();
  });

  it('offers it with studio.system', () => {
    renderAdmin(<StudioHome>body</StudioHome>, {
      permissions: ['studio.use', 'studio.system'],
    });
    expect(
      screen.getByRole('button', { name: 'Check worker' })
    ).toBeInTheDocument();
  });
});

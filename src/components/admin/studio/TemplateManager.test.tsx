import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const T = { id: 't1', name: 'コラム', description: '', instructions: 'です・ます調', defaultCategory: 'useful-info', isDefault: true };
vi.mock('@/actions/studio-templates', () => ({
  listTemplatesAction: vi.fn(async () => ({ ok: true, data: [T] })),
  createTemplateAction: vi.fn(),
  updateTemplateAction: vi.fn(async () => ({ ok: true, data: undefined })),
  deleteTemplateAction: vi.fn(),
}));

import { deleteTemplateAction, listTemplatesAction, updateTemplateAction } from '@/actions/studio-templates';
import TemplateManager from './TemplateManager';

describe('TemplateManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is read-only without studio.templates.manage', async () => {
    renderAdmin(<TemplateManager />, { permissions: ['studio.use'] });
    expect(await screen.findByText('コラム')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New template' })).toBeNull();
  });

  it('saves edits and never offers to delete the default template', async () => {
    renderAdmin(<TemplateManager />, { permissions: ['studio.use', 'studio.templates.manage'] });
    const name = await screen.findByDisplayValue('コラム');
    await userEvent.clear(name);
    await userEvent.type(name, 'コラム（改）');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTemplateAction).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'コラム（改）', defaultCategory: 'useful-info' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('shows why a save failed', async () => {
    vi.mocked(updateTemplateAction).mockResolvedValueOnce({ ok: false, error: 'INVALID_INPUT' });
    renderAdmin(<TemplateManager />, { permissions: ['studio.use', 'studio.templates.manage'] });
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the values and try again.');
  });

  it('shows why a delete was refused', async () => {
    vi.mocked(listTemplatesAction).mockResolvedValue({ ok: true, data: [{ ...T, id: 't2', isDefault: false }] } as never);
    vi.mocked(deleteTemplateAction).mockResolvedValueOnce({ ok: false, error: 'BLOCKED', reason: 'DEFAULT_TEMPLATE' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAdmin(<TemplateManager />, { permissions: ['studio.use', 'studio.templates.manage'] });
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The default template cannot be deleted.');
  });
});

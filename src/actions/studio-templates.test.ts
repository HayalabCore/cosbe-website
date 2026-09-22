import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed } from '@/test/authz';

vi.mock('@/lib/authz', () => ({ requirePermission: vi.fn(), requireAnyPermission: vi.fn(), requireActiveSession: vi.fn() }));
vi.mock('@/generator/pieces/pieces-repository', () => ({
  listTemplates: vi.fn(async () => []),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(async () => ({ id: 't1' })),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

import { createTemplate, deleteTemplate, getTemplate } from '@/generator/pieces/pieces-repository';
import { createTemplateAction, deleteTemplateAction } from './studio-templates';

const T = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const input = { name: 'コラム', description: '', instructions: 'です・ます調', defaultCategory: 'useful-info' as const };

describe('template actions', () => {
  beforeEach(() => { vi.clearAllMocks(); authed(); });

  it('needs studio.templates.manage to create', async () => {
    authed(['studio.use']);
    await expect(createTemplateAction(input)).rejects.toThrow('Forbidden');
  });

  it('creates a template', async () => {
    expect(await createTemplateAction(input)).toEqual({ ok: true, data: { templateId: 't1' } });
    expect(createTemplate).toHaveBeenCalled();
  });

  it('refuses to delete the default template', async () => {
    vi.mocked(getTemplate).mockResolvedValue({ id: T, isDefault: true } as never);
    expect(await deleteTemplateAction(T)).toMatchObject({ ok: false, error: 'BLOCKED' });
    expect(deleteTemplate).not.toHaveBeenCalled();
  });
});

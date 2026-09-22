import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('@/generator/sources/projects-repository', () => ({
  createProject: vi.fn(async (input) => ({ id: 'p1', ...input })),
  listProjects: vi.fn(async () => []),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  linkSource: vi.fn(),
  unlinkSource: vi.fn(),
  listProjectSources: vi.fn(async () => []),
}));

import {
  createProject,
  getProject,
  linkSource,
} from '@/generator/sources/projects-repository';
import {
  createProjectAction,
  getProjectAction,
  linkSourceAction,
} from './studio-projects';

const P = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const S = '8f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

describe('studio project actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('requires studio.use', async () => {
    authed([]);
    await expect(createProjectAction({ name: 'x' })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('creates a project', async () => {
    expect(await createProjectAction({ name: ' Webinar Q3 ' })).toEqual({
      ok: true,
      data: { projectId: 'p1' },
    });
    expect(createProject).toHaveBeenCalledWith({
      name: 'Webinar Q3',
      description: '',
      createdById: TEST_USER.id,
    });
  });

  it('rejects a blank name', async () => {
    expect(await createProjectAction({ name: '  ' })).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });

  it('returns NOT_FOUND for an unknown project', async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    expect(await getProjectAction(P)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('links a source', async () => {
    expect((await linkSourceAction(P, S)).ok).toBe(true);
    expect(linkSource).toHaveBeenCalledWith(P, S, TEST_USER.id);
  });
});

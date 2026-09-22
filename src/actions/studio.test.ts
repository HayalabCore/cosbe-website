import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('@/lib/studio/web-boss', () => ({
  getWebBoss: vi.fn(async () => ({ boss: true })),
}));
vi.mock('@/generator/queue/enqueue', () => ({
  createAndEnqueueRun: vi.fn(),
}));
vi.mock('@/generator/runs/runs-repository', () => ({ getRun: vi.fn() }));

import { createAndEnqueueRun } from '@/generator/queue/enqueue';
import { getRun } from '@/generator/runs/runs-repository';
import { getRunStatusAction, startSystemCheckAction } from './studio';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

describe('studio actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('startSystemCheckAction throws Unauthorized when logged out', async () => {
    unauth();
    await expect(startSystemCheckAction()).rejects.toThrow('Unauthorized');
  });

  it('startSystemCheckAction requires studio.use', async () => {
    authed(['articles.edit']);
    await expect(startSystemCheckAction()).rejects.toThrow('Forbidden');
    expect(createAndEnqueueRun).not.toHaveBeenCalled();
  });

  it('startSystemCheckAction enqueues a system_check run for the admin', async () => {
    vi.mocked(createAndEnqueueRun).mockResolvedValue({ id: RUN_ID } as never);
    expect(await startSystemCheckAction()).toEqual({
      ok: true,
      data: { runId: RUN_ID },
    });
    expect(createAndEnqueueRun).toHaveBeenCalledWith(
      { boss: true },
      { kind: 'system_check', createdById: TEST_USER.id }
    );
  });

  it('startSystemCheckAction returns FAILED when enqueueing throws', async () => {
    vi.mocked(createAndEnqueueRun).mockRejectedValue(new Error('no schema'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startSystemCheckAction()).toEqual({
      ok: false,
      error: 'FAILED',
    });
  });

  it('getRunStatusAction rejects a malformed id', async () => {
    expect(await getRunStatusAction('nope')).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(getRun).not.toHaveBeenCalled();
  });

  it('getRunStatusAction returns NOT_FOUND for a missing run', async () => {
    vi.mocked(getRun).mockResolvedValue(null);
    expect(await getRunStatusAction(RUN_ID)).toEqual({
      ok: false,
      error: 'NOT_FOUND',
    });
  });

  it('getRunStatusAction returns the run DTO', async () => {
    vi.mocked(getRun).mockResolvedValue({
      id: RUN_ID,
      kind: 'system_check',
      status: 'running',
      error: null,
      createdAt: new Date('2026-09-22T00:00:00Z'),
      startedAt: null,
      finishedAt: null,
      steps: [],
    } as never);
    const result = await getRunStatusAction(RUN_ID);
    expect(result.ok && result.data.status).toBe('running');
  });

  it('getRunStatusAction requires studio.use', async () => {
    authed([]);
    await expect(getRunStatusAction(RUN_ID)).rejects.toThrow('Forbidden');
  });
});

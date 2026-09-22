import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import type { RunStatusDTO } from '@/lib/studio/action-types';

vi.mock('@/actions/studio', () => ({
  startSystemCheckAction: vi.fn(),
  getRunStatusAction: vi.fn(),
}));

import { getRunStatusAction, startSystemCheckAction } from '@/actions/studio';
import SystemCheckCard from './SystemCheckCard';

const RUN_ID = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

function dto(
  status: RunStatusDTO['status'],
  extra: Partial<RunStatusDTO> = {}
): RunStatusDTO {
  return {
    id: RUN_ID,
    kind: 'system_check',
    status,
    error: null,
    createdAt: '2026-09-22T00:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    steps: [],
    ...extra,
  };
}

async function start() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderAdmin(<SystemCheckCard />);
  await user.click(screen.getByRole('button', { name: 'Run system check' }));
}

async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

describe('SystemCheckCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(startSystemCheckAction).mockResolvedValue({
      ok: true,
      data: { runId: RUN_ID },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('polls until the run succeeds and shows the worker and duration', async () => {
    vi.mocked(getRunStatusAction)
      .mockResolvedValueOnce({ ok: true, data: dto('running') })
      .mockResolvedValueOnce({
        ok: true,
        data: dto('succeeded', {
          finishedAt: '2026-09-22T00:00:03.000Z',
          steps: [
            {
              key: 'ping',
              status: 'succeeded',
              output: { worker: 'w-1' },
              error: null,
            },
          ],
        }),
      });
    await start();
    expect(
      screen.getByRole('button', { name: 'Run system check' })
    ).toBeDisabled();
    await tick();
    expect(
      await screen.findByText('Worker is running the check…')
    ).toBeInTheDocument();
    await tick();
    expect(
      await screen.findByText('Worker w-1 completed the check in 3s.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Run system check' })
    ).toBeEnabled();
  });

  it('shows the run error when the check fails', async () => {
    vi.mocked(getRunStatusAction).mockResolvedValue({
      ok: true,
      data: dto('failed', { error: 'FORBIDDEN' }),
    });
    await start();
    await tick();
    expect(
      await screen.findByText('The check failed: FORBIDDEN')
    ).toBeInTheDocument();
  });

  it('shows a start error when enqueueing fails', async () => {
    vi.mocked(startSystemCheckAction).mockResolvedValue({
      ok: false,
      error: 'FAILED',
    });
    await start();
    expect(
      await screen.findByText('Could not start the check.')
    ).toBeInTheDocument();
    expect(getRunStatusAction).not.toHaveBeenCalled();
  });

  it('gives up after 90 seconds without a result', async () => {
    vi.mocked(getRunStatusAction).mockResolvedValue({
      ok: true,
      data: dto('queued'),
    });
    await start();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000 * 45);
    });
    expect(
      await screen.findByText(
        'No response after 90 seconds. Is the studio worker running?'
      )
    ).toBeInTheDocument();
  });
});

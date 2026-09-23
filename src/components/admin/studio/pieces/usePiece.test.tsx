import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/actions/studio-pieces', () => ({ getPieceAction: vi.fn() }));

import { getPieceAction } from '@/actions/studio-pieces';
import { usePiece } from './usePiece';

const running = { id: 'p1', updatedAt: '1', activeRun: { id: 'r' } };

describe('usePiece', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps polling after a failed refresh while a run is active', async () => {
    vi.mocked(getPieceAction)
      .mockResolvedValueOnce({ ok: true, data: running } as never)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        ok: true,
        data: { ...running, updatedAt: '2', activeRun: null },
      } as never);
    const { result } = renderHook(() => usePiece('p1'));
    await act(async () => {});
    expect(result.current.piece?.updatedAt).toBe('1');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.error).not.toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.piece?.updatedAt).toBe('2');
    expect(result.current.error).toBeNull();
  });
});

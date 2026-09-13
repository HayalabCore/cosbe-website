import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { AccessResult } from '@/lib/access-types';
import { useAccessAction } from './use-access-action';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('useAccessAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies onOk then refreshes on success', async () => {
    const onOk = vi.fn();
    const { result } = renderHook(() => useAccessAction());
    await act(async () => {
      await result.current.run(
        async () => ({ ok: true, data: { id: '1' } }),
        onOk
      );
    });
    expect(onOk).toHaveBeenCalledWith({ id: '1' });
    expect(refresh).toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('marks only the given key busy while the action is in flight', async () => {
    let finish!: (value: AccessResult<undefined>) => void;
    const { result } = renderHook(() => useAccessAction());
    let pending: Promise<void>;
    act(() => {
      pending = result.current.run(
        () =>
          new Promise<AccessResult<undefined>>((resolve) => {
            finish = resolve;
          }),
        () => undefined,
        'role-a'
      );
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.isBusy('role-a')).toBe(true);
    expect(result.current.isBusy('role-b')).toBe(false);
    await act(async () => {
      finish({ ok: true, data: undefined });
      await pending;
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.isBusy('role-a')).toBe(false);
  });

  it('records unexpected throws as FAILED, not FORBIDDEN', async () => {
    const onOk = vi.fn();
    const { result } = renderHook(() => useAccessAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
      }, onOk);
    });
    expect(onOk).not.toHaveBeenCalled();
    expect(result.current.error).toBe('FAILED');
  });

  it('records action errors without refreshing', async () => {
    const onOk = vi.fn();
    const { result } = renderHook(() => useAccessAction());
    await act(async () => {
      await result.current.run(
        async () => ({ ok: false, error: 'FORBIDDEN' }),
        onOk
      );
    });
    expect(onOk).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.error).toBe('FORBIDDEN');
  });
});

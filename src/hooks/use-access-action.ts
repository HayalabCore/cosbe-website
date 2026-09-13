'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessErrorCode, AccessResult } from '@/lib/access-types';

/**
 * Shared busy/error + refresh cycle for admin access mutations.
 * Callers apply an optimistic list update in `onOk` so the UI does not
 * wait for router.refresh() to finish.
 *
 * Pass `key` (usually a row id) so only that control shows as busy.
 */
export function useAccessAction() {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<AccessErrorCode | null>(null);

  const run = useCallback(
    async <T>(
      action: () => Promise<AccessResult<T>>,
      onOk: (data: T) => void,
      key = 'page'
    ) => {
      setBusyKey(key);
      setError(null);
      try {
        const res = await action();
        if (!res.ok) {
          setError(res.error);
          return;
        }
        onOk(res.data);
        router.refresh();
      } catch (error) {
        console.error('[useAccessAction]', error);
        setError('FAILED');
      } finally {
        setBusyKey(null);
      }
    },
    [router]
  );

  const isBusy = useCallback((key: string) => busyKey === key, [busyKey]);

  return { busy: busyKey !== null, isBusy, error, setError, run };
}

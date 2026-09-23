'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { StudioResult } from '@/lib/studio/action-types';
import { errorText } from './errorText';

/**
 * Runs a server action for a panel: tracks `pending` (so a double click is
 * one request), turns a thrown action into a message instead of an unhandled
 * rejection, and refreshes the piece afterwards.
 */
export function useStudioAction(
  refresh: () => Promise<void>,
  notify?: (message: string | null) => void
) {
  const t = useTranslations('admin.studio');
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const setMessage = notify ?? setLocal;

  async function run(
    action: () => Promise<StudioResult<unknown>>
  ): Promise<boolean> {
    if (pending) return false;
    setPending(true);
    setMessage(null);
    let ok = false;
    try {
      const result = await action();
      ok = result.ok;
      if (!result.ok) setMessage(errorText(t, result));
    } catch {
      setMessage(errorText(t, { error: 'FAILED' }));
    } finally {
      setPending(false);
    }
    await refresh();
    return ok;
  }

  return { run, pending, message: notify ? null : local, setMessage };
}

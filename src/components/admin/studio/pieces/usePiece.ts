'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPieceAction } from '@/actions/studio-pieces';
import type { PieceDTO } from '@/lib/studio/piece-dto';

const POLL_MS = 2000;

export function usePiece(id: string) {
  const [piece, setPiece] = useState<PieceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after every attempt so a failed poll still schedules the next. */
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    () =>
      getPieceAction(id)
        .then(
          (result) => {
            if (result.ok) {
              setPiece(result.data);
              setError(null);
            } else {
              setError(result.error);
            }
          },
          () => setError('FAILED')
        )
        .finally(() => setAttempt((n) => n + 1)),
    [id]
  );
  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!piece?.activeRun) return;
    const timer = window.setTimeout(() => void refresh(), POLL_MS);
    return () => window.clearTimeout(timer);
  }, [piece, attempt, refresh]);

  return { piece, refresh, error };
}

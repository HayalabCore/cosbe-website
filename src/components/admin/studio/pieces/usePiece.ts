'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPieceAction } from '@/actions/studio-pieces';
import type { PieceDTO } from '@/lib/studio/piece-dto';

const POLL_MS = 2000;

export function usePiece(id: string) {
  const [piece, setPiece] = useState<PieceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getPieceAction(id);
    if (result.ok) {
      setPiece(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void getPieceAction(id).then((result) => {
      if (cancelled) return;
      if (result.ok) setPiece(result.data);
      else setError(result.error);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!piece?.activeRun) return;
    const timer = window.setTimeout(() => void refresh(), POLL_MS);
    return () => window.clearTimeout(timer);
  }, [piece, refresh]);

  return { piece, refresh, error };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type AutosaveOptions = {
  /** How long (ms) to wait after the last change before auto-saving. Default 1000ms. */
  debounceMs?: number;
  /** How long (ms) to show the "saved" status before returning to idle. Default 2000ms. */
  savedIndicatorMs?: number;
};

export type AutosaveReturn = {
  status: SaveStatus;
  /** Call on onChange — schedules a debounced save. */
  onChange: (value: string) => void;
  /** Call on onBlur — immediately flushes if value changed. */
  onBlur: (value: string) => void;
  /** Externally mark a new value as already saved (e.g. after a restore). */
  markSaved: (value: string) => void;
};

/**
 * Manages debounced autosave for a single text field.
 *
 * Tracks the last persisted value so saves are skipped when the field
 * value hasn't changed (prevents spurious network calls on blur).
 */
export function useAutosave(
  initialValue: string,
  saveFn: (value: string) => Promise<boolean>,
  options: AutosaveOptions = {}
): AutosaveReturn {
  const { debounceMs = 1000, savedIndicatorMs = 2000 } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');
  const savedValueRef = useRef(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    savedValueRef.current = initialValue;
  }, [initialValue]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    },
    []
  );

  const flush = useCallback(
    async (value: string) => {
      if (value === savedValueRef.current) return;
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      setStatus('saving');
      const ok = await saveFn(value);
      if (ok) {
        savedValueRef.current = value;
        setStatus('saved');
        indicatorTimerRef.current = setTimeout(
          () => setStatus('idle'),
          savedIndicatorMs
        );
      } else {
        setStatus('error');
      }
    },
    [saveFn, savedIndicatorMs]
  );

  const onChange = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(value), debounceMs);
    },
    [debounceMs, flush]
  );

  const onBlur = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush(value);
    },
    [flush]
  );

  const markSaved = useCallback((value: string) => {
    savedValueRef.current = value;
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    setStatus('saved');
    indicatorTimerRef.current = setTimeout(
      () => setStatus('idle'),
      savedIndicatorMs
    );
    // savedIndicatorMs is a primitive from options, safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, onChange, onBlur, markSaved };
}

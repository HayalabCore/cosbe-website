'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a value that only updates after `ms` milliseconds of no changes.
 * Useful for delaying search queries or autosave triggers.
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

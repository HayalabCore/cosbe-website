'use client';

import { useCallback, useState } from 'react';

function applyNext<T>(item: T, next: Partial<T> | ((item: T) => T)): T {
  return typeof next === 'function' ? next(item) : { ...item, ...next };
}

/**
 * Local copy of a server-rendered list. Mutations update immediately;
 * a new `serverItems` reference (after router.refresh) replaces the copy.
 */
export function useSyncedList<T extends { id: string }>(serverItems: T[]) {
  const [items, setItems] = useState(serverItems);
  const [fromServer, setFromServer] = useState(serverItems);
  if (serverItems !== fromServer) {
    setFromServer(serverItems);
    setItems(serverItems);
  }

  const patch = useCallback(
    (id: string, next: Partial<T> | ((item: T) => T)) => {
      setItems((current) =>
        current.map((item) => (item.id === id ? applyNext(item, next) : item))
      );
    },
    []
  );

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const prepend = useCallback((item: T) => {
    setItems((current) => [
      item,
      ...current.filter((row) => row.id !== item.id),
    ]);
  }, []);

  const append = useCallback((item: T) => {
    setItems((current) =>
      current.some((row) => row.id === item.id) ? current : [...current, item]
    );
  }, []);

  const patchMany = useCallback(
    (ids: string[], next: Partial<T> | ((item: T) => T)) => {
      const idSet = new Set(ids);
      setItems((current) =>
        current.map((item) =>
          idSet.has(item.id) ? applyNext(item, next) : item
        )
      );
    },
    []
  );

  const removeMany = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((current) => current.filter((item) => !idSet.has(item.id)));
  }, []);

  const prependMany = useCallback((next: T[]) => {
    const incomingIds = new Set(next.map((item) => item.id));
    setItems((current) => [
      ...next,
      ...current.filter((row) => !incomingIds.has(row.id)),
    ]);
  }, []);

  return {
    items,
    patch,
    remove,
    prepend,
    append,
    patchMany,
    removeMany,
    prependMany,
  };
}

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSyncedList } from './use-synced-list';

describe('useSyncedList', () => {
  it('keeps local edits until the server list is a new reference', () => {
    const first = [{ id: 'a' }];
    const { result, rerender } = renderHook(
      ({ items }) => useSyncedList(items),
      { initialProps: { items: first } }
    );

    act(() => result.current.prepend({ id: 'b' }));
    expect(result.current.items.map((i) => i.id)).toEqual(['b', 'a']);

    rerender({ items: first });
    expect(result.current.items.map((i) => i.id)).toEqual(['b', 'a']);

    rerender({ items: [{ id: 'a' }, { id: 'c' }] });
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('patches and removes by id', () => {
    const initial = [{ id: 'a', name: 'Ada' }];
    const { result } = renderHook(() => useSyncedList(initial));
    act(() => result.current.patch('a', { name: 'Ada Lovelace' }));
    expect(result.current.items[0]?.name).toBe('Ada Lovelace');
    act(() => result.current.remove('a'));
    expect(result.current.items).toEqual([]);
  });

  it('patches and removes many ids at once', () => {
    const initial = [
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Bea' },
      { id: 'c', name: 'Cyd' },
    ];
    const { result } = renderHook(() => useSyncedList(initial));
    act(() => result.current.patchMany(['a', 'c'], { name: 'patched' }));
    expect(result.current.items.map((i) => i.name)).toEqual([
      'patched',
      'Bea',
      'patched',
    ]);
    act(() => result.current.removeMany(['a', 'c']));
    expect(result.current.items.map((i) => i.id)).toEqual(['b']);
  });

  it('prepends many without duplicating ids', () => {
    const initial = [{ id: 'a' }];
    const { result } = renderHook(() => useSyncedList(initial));
    act(() => result.current.prependMany([{ id: 'b' }, { id: 'a' }]));
    expect(result.current.items.map((i) => i.id)).toEqual(['b', 'a']);
  });
});

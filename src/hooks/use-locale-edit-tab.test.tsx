import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocaleEditTab } from './use-locale-edit-tab';

describe('useLocaleEditTab', () => {
  it('stays on original until the parent broadcasts a view key', () => {
    const { result } = renderHook(() => useLocaleEditTab(0, 'english'));
    expect(result.current[0]).toBe('original');
  });

  it('snaps to the parent tab when the view key changes', () => {
    const { result, rerender } = renderHook(
      ({ key, tab }: { key?: number; tab: 'original' | 'english' }) =>
        useLocaleEditTab(key, tab),
      { initialProps: { key: 0 as number | undefined, tab: 'original' as const } }
    );

    act(() => result.current[1]('english'));
    expect(result.current[0]).toBe('english');

    rerender({ key: 1, tab: 'original' });
    expect(result.current[0]).toBe('original');
  });
});

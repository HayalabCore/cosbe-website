'use client';

import { useState } from 'react';
import type { LocaleEditTab } from '@/components/admin/BlockLocaleTabs';

/**
 * Local JA/EN tab that snaps to the article-wide view when the parent
 * increments `localeViewKey`. State is adjusted during render so we do not
 * need a synchronizing effect.
 */
export function useLocaleEditTab(
  localeViewKey: number | undefined,
  localeViewTab: LocaleEditTab = 'original'
) {
  const [tab, setTab] = useState<LocaleEditTab>('original');
  const [appliedKey, setAppliedKey] = useState(0);
  const key = localeViewKey ?? 0;
  if (key > 0 && key !== appliedKey) {
    setAppliedKey(key);
    setTab(localeViewTab);
  }
  return [tab, setTab, appliedKey] as const;
}

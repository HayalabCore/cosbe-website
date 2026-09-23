'use client';

import { createContext, useContext } from 'react';
import type { Editor } from '@tiptap/core';

/**
 * Inside the post editor's canvas, each block row owns a floating toolbar.
 * Block editors render their language controls into it (see BlockLocaleTabs)
 * instead of above their fields. Outside a canvas this is null and the
 * controls render inline, as before.
 */
export const BlockToolbarSlot = createContext<HTMLElement | null>(null);

export function useBlockToolbarSlot() {
  return useContext(BlockToolbarSlot);
}

/**
 * The canvas's single formatting bar. Paragraph editors hand it their TipTap
 * editor when they gain focus, instead of each rendering their own toolbar.
 */
export type FormatBarApi = { activate: (editor: Editor) => void };

export const FormatBarContext = createContext<FormatBarApi | null>(null);

export function useFormatBar() {
  return useContext(FormatBarContext);
}

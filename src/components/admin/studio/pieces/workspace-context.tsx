'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PieceDTO } from '@/lib/studio/piece-dto';
import type { Step } from './steps';

export type Snapshot = { id: string; reason: string; createdAt: string };

export type Workspace = {
  piece: PieceDTO;
  /** A run is working on the piece; edits wait for it. */
  busy: boolean;
  /** Handed off: everything is read-only. */
  locked: boolean;
  refresh: () => Promise<void>;
  /** Shows an action's outcome in the command bar, next to the buttons. */
  notify: (message: string | null) => void;
  notice: string | null;
  snapshots: Snapshot[];
  cancel: () => Promise<void>;
  go: (step: Step) => void;
};

const Context = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: Workspace;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWorkspace(): Workspace {
  const value = useContext(Context);
  if (!value) throw new Error('useWorkspace outside PieceWorkspace');
  return value;
}

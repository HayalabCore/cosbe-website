import type { PieceDTO } from '@/lib/studio/piece-dto';

export type PanelProps = {
  piece: PieceDTO;
  busy: boolean;
  /** Handed off: past stages are viewable but nothing can change. */
  locked?: boolean;
  refresh: () => Promise<void>;
  /**
   * Shows an action's outcome above the panel. Panels remount when the piece
   * changes, so a message kept in panel state would vanish after a save.
   */
  notify?: (message: string | null) => void;
};

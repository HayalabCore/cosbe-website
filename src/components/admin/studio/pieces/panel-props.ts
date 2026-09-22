import type { PieceDTO } from '@/lib/studio/piece-dto';

export type PanelProps = { piece: PieceDTO; busy: boolean; refresh: () => Promise<void> };

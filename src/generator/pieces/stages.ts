import type {
  Brief,
  OutlineSection,
  PieceStage,
  Section,
  Selection,
} from './piece-types';

/** Why a stage rule blocks an action. The UI translates these codes. */
export const BLOCK_REASONS = [
  'NO_SOURCES',
  'SOURCES_NOT_READY',
  'NO_GOAL',
  'NO_OUTLINE',
  'INCOMPLETE',
  'NOT_REVIEWED',
  'NO_TITLE',
] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

export const STAGE_ORDER: readonly PieceStage[] = [
  'sources',
  'brief',
  'outline',
  'writing',
  'review',
  'translating',
  'ready',
  'handed_off',
];

export function canStartOutline(
  p: { selection: Selection; brief: Brief },
  sources?: Array<{ id: string; status: string }>
): BlockReason | null {
  if (p.selection.sourceIds.length === 0) return 'NO_SOURCES';
  if (sources) {
    // Ids unlinked from the project since selection are ignored, not fatal.
    const linked = new Set(sources.map((source) => source.id));
    if (!p.selection.sourceIds.some((id) => linked.has(id)))
      return 'NO_SOURCES';
    const ready = new Set(
      sources
        .filter((source) => source.status === 'ready')
        .map((source) => source.id)
    );
    if (!p.selection.sourceIds.some((id) => ready.has(id)))
      return 'SOURCES_NOT_READY';
  }
  if (!p.brief.goal.trim())
    return 'NO_GOAL';
  return null;
}

export function canStartWriting(p: {
  outline: OutlineSection[];
}): BlockReason | null {
  return p.outline.length === 0 ? 'NO_OUTLINE' : null;
}

type CompletenessInput = {
  outline: OutlineSection[];
  sections: Section[];
  excerpt: string | null;
};

/** Every outline section written and fresh, and the finish step ran. */
export function isComplete(p: CompletenessInput): boolean {
  if (p.outline.length === 0 || p.excerpt === null) return false;
  const written = new Set(p.sections.map((s) => s.outlineId));
  return p.outline.every((o) => !o.stale && written.has(o.id));
}

export function isTranslated(p: {
  sections: Section[];
  titleEn: string | null;
}): boolean {
  return (
    Boolean(p.titleEn?.trim()) &&
    p.sections.length > 0 &&
    p.sections.every((s) => s.en !== null && !s.enStale)
  );
}

/**
 * The stage a piece belongs in once the run that set a transient stage ended
 * without finishing (failed or cancelled). Derived from the content, not from
 * where the run started, so it is right however far the run got.
 */
export function settledStage(
  p: CompletenessInput & { stage: PieceStage; titleEn: string | null }
): PieceStage {
  if (p.stage === 'writing') return isComplete(p) ? 'review' : 'outline';
  if (p.stage === 'translating') {
    if (!isComplete(p)) return 'outline';
    return isTranslated(p) ? 'ready' : 'review';
  }
  return p.stage;
}

export function canTranslate(p: CompletenessInput): BlockReason | null {
  return isComplete(p) ? null : 'INCOMPLETE';
}

export function canHandOff(
  p: CompletenessInput & { stage: PieceStage; title: string }
): BlockReason | null {
  if (p.stage !== 'review' && p.stage !== 'ready') return 'NOT_REVIEWED';
  if (!p.title.trim()) return 'NO_TITLE';
  if (!isComplete(p)) return 'INCOMPLETE';
  return null;
}

export function isLocked(stage: PieceStage): boolean {
  return stage === 'handed_off';
}

export function stageAfterOutlineEdit(stage: PieceStage): PieceStage {
  return STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf('outline')
    ? 'outline'
    : stage;
}

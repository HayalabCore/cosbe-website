import type { PieceData } from '@/generator/pieces/pieces-repository';
import type { PieceStage } from '@/generator/pieces/piece-types';
import type { RunWithSteps } from '@/generator/runs/runs-repository';
import type { RunStatus } from '@/generator/runs/run-types';

export type ActiveRunDTO = {
  id: string;
  kind: string;
  status: RunStatus;
  error: string | null;
  steps: Array<{ key: string; status: string }>;
  /** Sections a write run will write (from its prepare step); step rows appear only as each starts. */
  targets: number | null;
  /**
   * How long the run has existed, measured on the server when the piece was
   * read (the browser's clock may be off). A run still queued long after it
   * was created is not being picked up.
   */
  ageMs: number;
};

export type PieceDTO = Omit<
  PieceData,
  'createdAt' | 'updatedAt' | 'handedOffAt' | 'archivedAt'
> & {
  createdAt: string;
  updatedAt: string;
  handedOffAt: string | null;
  archivedAt: string | null;
  activeRun: ActiveRunDTO | null;
  lastRunError: string | null;
  article: {
    id: string;
    status: string;
    slug: string;
    category: string;
  } | null;
  projectName: string;
};

export type PieceListItemDTO = {
  id: string;
  title: string;
  projectName: string;
  stage: PieceStage;
  articleStatus: string | null;
  updatedAt: string;
  archived: boolean;
};

function prepareTargets(steps: RunWithSteps['steps']): number | null {
  const output = steps.find((s) => s.key === 'prepare')?.output as
    { targets?: unknown } | null | undefined;
  return typeof output?.targets === 'number' ? output.targets : null;
}

export function toActiveRunDTO(
  run: RunWithSteps | null,
  now: Date = new Date()
): ActiveRunDTO | null {
  if (!run) return null;
  return {
    id: run.id,
    kind: run.kind,
    status: run.status as RunStatus,
    error: run.error,
    steps: run.steps.map((s) => ({ key: s.key, status: s.status })),
    targets: prepareTargets(run.steps),
    ageMs: Math.max(0, now.getTime() - run.createdAt.getTime()),
  };
}

export function toPieceDTO(
  data: PieceData,
  extras: Pick<
    PieceDTO,
    'activeRun' | 'lastRunError' | 'article' | 'projectName'
  >
): PieceDTO {
  return {
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    handedOffAt: data.handedOffAt?.toISOString() ?? null,
    archivedAt: data.archivedAt?.toISOString() ?? null,
    ...extras,
  };
}

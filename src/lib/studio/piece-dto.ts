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
};

export type PieceDTO = Omit<PieceData, 'createdAt' | 'updatedAt' | 'handedOffAt'> & {
  createdAt: string;
  updatedAt: string;
  handedOffAt: string | null;
  activeRun: ActiveRunDTO | null;
  lastRunError: string | null;
  article: { id: string; status: string; slug: string; category: string } | null;
};

export type PieceListItemDTO = {
  id: string;
  title: string;
  projectName: string;
  stage: PieceStage;
  articleStatus: string | null;
  updatedAt: string;
};

function prepareTargets(steps: RunWithSteps['steps']): number | null {
  const output = steps.find((s) => s.key === 'prepare')?.output as
    | { targets?: unknown }
    | null
    | undefined;
  return typeof output?.targets === 'number' ? output.targets : null;
}

export function toActiveRunDTO(run: RunWithSteps | null): ActiveRunDTO | null {
  if (!run) return null;
  return {
    id: run.id,
    kind: run.kind,
    status: run.status as RunStatus,
    error: run.error,
    steps: run.steps.map((s) => ({ key: s.key, status: s.status })),
    targets: prepareTargets(run.steps),
  };
}

export function toPieceDTO(
  data: PieceData,
  extras: Pick<PieceDTO, 'activeRun' | 'lastRunError' | 'article'>
): PieceDTO {
  return {
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    handedOffAt: data.handedOffAt?.toISOString() ?? null,
    ...extras,
  };
}

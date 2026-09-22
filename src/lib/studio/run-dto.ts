import type { RunWithSteps } from '@/generator/runs/runs-repository';
import type { RunStatus } from '@/generator/runs/run-types';
import type { RunStatusDTO } from './action-types';

export function toRunStatusDTO(run: RunWithSteps): RunStatusDTO {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status as RunStatus,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    steps: run.steps.map((step) => ({
      key: step.key,
      status: step.status,
      output: step.output,
      error: step.error,
    })),
  };
}

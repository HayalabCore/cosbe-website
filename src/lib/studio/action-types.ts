import type { RunStatus } from '@/generator/runs/run-types';

export type StudioErrorCode =
  'INVALID_INPUT' | 'NOT_FOUND' | 'FAILED' | 'LINKED' | 'TOO_LARGE';

export type StudioResult<T> =
  { ok: true; data: T } | { ok: false; error: StudioErrorCode };

export type RunStatusDTO = {
  id: string;
  kind: string;
  status: RunStatus;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: Array<{
    key: string;
    status: string;
    output: unknown;
    error: string | null;
  }>;
};

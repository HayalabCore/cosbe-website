import type { RunExecutors } from '../runs/run-handler';
import { ingestExecutor } from './ingest';
import { systemCheckExecutor } from './system-check';

/** Later plans register their executors here. */
export const RUN_EXECUTORS: RunExecutors = {
  system_check: systemCheckExecutor,
  ingest: ingestExecutor,
};

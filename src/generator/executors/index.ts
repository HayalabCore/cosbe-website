import type { RunExecutors } from '../runs/run-handler';
import { ingestExecutor } from './ingest';
import { outlineExecutor } from './outline';
import { rewriteSectionExecutor } from './rewrite-section';
import { systemCheckExecutor } from './system-check';
import { translateExecutor } from './translate';
import { writeExecutor } from './write';

/** Later plans register their executors here. */
export const RUN_EXECUTORS: RunExecutors = {
  system_check: systemCheckExecutor,
  ingest: ingestExecutor,
  outline: outlineExecutor,
  write: writeExecutor,
  rewrite_section: rewriteSectionExecutor,
  translate: translateExecutor,
};

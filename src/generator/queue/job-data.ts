import { z } from 'zod';

/** Everything else a job needs is read from its studio_runs row. */
export const runJobDataSchema = z.object({ runId: z.uuid() });
export type RunJobData = z.infer<typeof runJobDataSchema>;

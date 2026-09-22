import { z } from 'zod';

const envSchema = z.object({
  /** Transaction pooler; append `&connection_limit=3` in production. */
  DATABASE_URL: z.string().min(1),
  /** Session pooler (:5432). pg-boss needs a session-mode connection. */
  DIRECT_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function loadWorkerEnv(
  env: Record<string, string | undefined> = process.env
): WorkerEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Invalid worker environment: ${keys.join(', ')}`);
  }
  return parsed.data;
}

import { z } from 'zod';

const envSchema = z.object({
  /** Transaction pooler; append `&connection_limit=3` in production. */
  DATABASE_URL: z.string().min(1),
  /** Session pooler (:5432). pg-boss needs a session-mode connection. */
  DIRECT_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8080),
  OPENAI_API_KEY: z.string().min(1),
});

export type WorkerEnv = z.infer<typeof envSchema>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isLocal(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function loadWorkerEnv(
  env: Record<string, string | undefined> = process.env
): WorkerEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(`Invalid worker environment: ${keys.join(', ')}`);
  }
  // `yarn worker:dev` loads .env, which points at Supabase. A laptop worker
  // there would take real jobs with uncommitted code.
  const remoteAllowed =
    env.NODE_ENV === 'production' || env.STUDIO_WORKER_ALLOW_REMOTE === '1';
  const local =
    isLocal(parsed.data.DIRECT_URL) && isLocal(parsed.data.DATABASE_URL);
  if (!remoteAllowed && !local) {
    throw new Error(
      'Refusing to attach a development worker to a remote database. Set STUDIO_WORKER_ALLOW_REMOTE=1 if you mean it.'
    );
  }
  return parsed.data;
}

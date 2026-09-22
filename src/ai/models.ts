import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModel, LanguageModel } from 'ai';

export const AI_TASKS = [
  'outline',
  'write',
  'repair',
  'digest',
  'translate',
  'finish',
  'agent',
] as const;
export type AiTask = (typeof AI_TASKS)[number];

/**
 * Defaults only. Production sets STUDIO_MODEL_<TASK> to the current model ids
 * from the OpenAI dashboard; these exist so local runs work without config.
 */
const STRONG_DEFAULT = 'openai:gpt-4o';
const SMALL_DEFAULT = 'openai:gpt-4o-mini';
const EMBEDDING_DEFAULT = 'openai:text-embedding-3-small';

/** Must match the vector(1536) columns added in P1b. */
export const EMBEDDING_DIMENSIONS = 1536;

const TASK_DEFAULTS: Record<AiTask, string> = {
  outline: STRONG_DEFAULT,
  write: STRONG_DEFAULT,
  repair: STRONG_DEFAULT,
  agent: STRONG_DEFAULT,
  digest: STRONG_DEFAULT,
  translate: SMALL_DEFAULT,
  finish: SMALL_DEFAULT,
};

const PROVIDERS = ['openai'] as const;
type Provider = (typeof PROVIDERS)[number];

export type ModelSpec = { provider: Provider; modelId: string };
type Env = Record<string, string | undefined>;

export function parseModelSpec(spec: string): ModelSpec {
  const separator = spec.indexOf(':');
  const provider = spec.slice(0, separator);
  const modelId = spec.slice(separator + 1);
  if (separator < 1 || !modelId) {
    throw new Error(
      `Invalid model spec "${spec}". Use "<provider>:<model-id>".`
    );
  }
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`Unsupported AI provider "${provider}" in "${spec}".`);
  }
  return { provider: provider as Provider, modelId };
}

export function modelSpecForTask(
  task: AiTask,
  env: Env = process.env
): ModelSpec {
  return parseModelSpec(
    env[`STUDIO_MODEL_${task.toUpperCase()}`] ?? TASK_DEFAULTS[task]
  );
}

export function embeddingSpec(env: Env = process.env): ModelSpec {
  return parseModelSpec(env.STUDIO_MODEL_EMBED ?? EMBEDDING_DEFAULT);
}

function openaiProvider(env: Env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return createOpenAI({ apiKey });
}

export function languageModelForTask(
  task: AiTask,
  env: Env = process.env
): LanguageModel {
  return openaiProvider(env)(modelSpecForTask(task, env).modelId);
}

export function embeddingModel(env: Env = process.env): EmbeddingModel {
  return openaiProvider(env).embedding(embeddingSpec(env).modelId);
}

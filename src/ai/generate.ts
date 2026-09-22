import {
  embedMany,
  generateText,
  Output,
  type EmbeddingModel,
  type LanguageModel,
  type LanguageModelUsage,
} from 'ai';
import type { ZodType } from 'zod';
import {
  EMBEDDING_DIMENSIONS,
  embeddingModel,
  languageModelForTask,
  type AiTask,
} from './models';

export type TokenUsage = { inputTokens: number; outputTokens: number };
export type UsageSink = (usage: TokenUsage) => Promise<void> | void;

export type AiCallOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  /** Tests inject a mock model; production resolves it from the task. */
  model?: LanguageModel;
};

export type EmbedOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  model?: EmbeddingModel;
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 120_000;

async function reportUsage(
  sink: UsageSink | undefined,
  usage: LanguageModelUsage
): Promise<void> {
  if (!sink) return;
  await sink({
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  });
}

/** One structured call. Prompts are never logged: they carry source text. */
export async function generateStructured<T>(
  task: AiTask,
  request: {
    schema: ZodType<T>;
    schemaName: string;
    instructions: string;
    prompt: string;
  },
  options: AiCallOptions = {}
): Promise<T> {
  const result = await generateText({
    model: options.model ?? languageModelForTask(task),
    instructions: request.instructions,
    prompt: request.prompt,
    output: Output.object({ schema: request.schema, name: request.schemaName }),
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
    abortSignal: options.signal,
  });
  await reportUsage(options.onUsage, result.totalUsage);
  return result.output as T;
}

export async function generatePlainText(
  task: AiTask,
  request: { instructions: string; prompt: string },
  options: AiCallOptions = {}
): Promise<string> {
  const result = await generateText({
    model: options.model ?? languageModelForTask(task),
    instructions: request.instructions,
    prompt: request.prompt,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
    abortSignal: options.signal,
  });
  await reportUsage(options.onUsage, result.totalUsage);
  return result.text;
}

export async function embedTexts(
  values: string[],
  options: EmbedOptions = {}
): Promise<number[][]> {
  if (values.length === 0) return [];
  const result = await embedMany({
    model: options.model ?? embeddingModel(),
    values,
    maxRetries: MAX_RETRIES,
    abortSignal: options.signal,
  });
  for (const embedding of result.embeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding has ${embedding.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
      );
    }
  }
  if (options.onUsage) {
    await options.onUsage({
      inputTokens: result.usage.tokens,
      outputTokens: 0,
    });
  }
  return result.embeddings;
}

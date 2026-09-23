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

export type BudgetCheck = (estimatedTokens: number) => Promise<void>;

export type AiCallOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  /** Refuse the call when the run cannot afford this estimate. */
  ensureBudget?: BudgetCheck;
  /** Tests inject a mock model; production resolves it from the task. */
  model?: LanguageModel;
};

export type EmbedOptions = {
  onUsage?: UsageSink;
  signal?: AbortSignal;
  ensureBudget?: BudgetCheck;
  model?: EmbeddingModel;
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 120_000;
const OUTPUT_RESERVE = 4_096;

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/** Japanese runs about one token per character; Latin text about four characters per token. */
export function estimateTokens(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0;
  return cjk + Math.ceil((text.length - cjk) / 4);
}

async function guardBudget(
  ensureBudget: BudgetCheck | undefined,
  text: string,
  outputReserve: number
): Promise<void> {
  if (ensureBudget) await ensureBudget(estimateTokens(text) + outputReserve);
}

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
  await guardBudget(
    options.ensureBudget,
    `${request.instructions}\n${request.prompt}`,
    OUTPUT_RESERVE
  );
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
  await guardBudget(
    options.ensureBudget,
    `${request.instructions}\n${request.prompt}`,
    OUTPUT_RESERVE
  );
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
  await guardBudget(options.ensureBudget, values.join('\n'), 0);
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const result = await embedMany({
    model: options.model ?? embeddingModel(),
    values,
    maxRetries: MAX_RETRIES,
    abortSignal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout,
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

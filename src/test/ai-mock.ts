import { MockLanguageModelV4 } from 'ai/test';

/** A mock language model answering each call with the next JSON object. */
export function jsonModel(responses: object[]): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: responses.map((response) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(response) }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    })),
  });
}

/** The prompt text the mock received on call `index`. */
export function promptOf(model: MockLanguageModelV4, index = 0): string {
  return JSON.stringify(model.doGenerateCalls[index]?.prompt ?? '');
}

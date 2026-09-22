import { embedTexts } from '@/ai/generate';
import { embeddingSpec } from '@/ai/models';
import { prisma } from '@/lib/prisma';
import type { ContentBlock } from '@/types';
import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { articleToSegments } from '../sources/article-text';
import { buildDigest } from '../sources/digest';
import type { SourceMeta } from '../sources/source-types';
import {
  getSource,
  replaceChunks,
  setSourceMeta,
  setSourceStatus,
  setSourceText,
} from '../sources/sources-repository';
import { chunkSegments, type Segment } from '../text/chunker';
import { contentHash } from '../text/hash';
import { detectLanguage } from '../text/language';

const EMBED_BATCH = 64;

async function fail(sourceId: string, message: string): Promise<never> {
  await setSourceStatus(sourceId, 'failed', message);
  throw new NonRetryableRunError(message);
}

async function extract(
  source: NonNullable<Awaited<ReturnType<typeof getSource>>>
): Promise<{
  text: string;
  segments: Segment[];
}> {
  if (source.kind === 'article') {
    const article = source.articleId
      ? await prisma.article.findUnique({
          where: { id: source.articleId },
          select: { blocks: true },
        })
      : null;
    if (!article)
      return fail(source.id, 'The linked article no longer exists.');
    return articleToSegments(article.blocks as unknown as ContentBlock[]);
  }
  const text = (source.text ?? '').trim();
  return { text, segments: [{ text, start: 0, locator: {} }] };
}

/** extract → chunk + embed → digest; each step is resumable. */
export const ingestExecutor: RunExecutor = async ({
  run,
  step,
  recordUsage,
  signal,
}) => {
  if (!run.sourceId)
    throw new NonRetryableRunError('Ingest run has no source.');
  const source = await getSource(run.sourceId);
  if (!source) throw new NonRetryableRunError('The source no longer exists.');

  if (source.kind === 'pdf') {
    await setSourceStatus(source.id, 'stored');
    return;
  }
  if (source.kind === 'youtube') {
    throw new NonRetryableRunError('YouTube ingest arrives in plan P1b-YT.');
  }

  await setSourceStatus(source.id, 'processing');
  const extracted = await step('extract', 0, async () => {
    const { text, segments } = await extract(source);
    if (!text.trim()) return fail(source.id, 'The source has no text.');
    await setSourceText(source.id, {
      text,
      language: detectLanguage(text),
      contentHash: contentHash(text),
    });
    return { text, segments };
  });

  const chunks = chunkSegments(extracted.segments);
  await step('chunk-embed', 1, async () => {
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => c.text);
      vectors.push(
        ...(await embedTexts(batch, { onUsage: recordUsage, signal }))
      );
    }
    await replaceChunks(
      source.id,
      chunks.map((c, i) => ({ ...c, embedding: vectors[i] })),
      embeddingSpec().modelId
    );
    return { chunkCount: chunks.length };
  });

  await step('digest', 2, async () => {
    const digest = await buildDigest(
      chunks.map((c) => ({
        ordinal: c.ordinal,
        text: c.text,
        label: String(c.locator.chapter ?? c.locator.blockId ?? 'all'),
      })),
      { onUsage: recordUsage, signal }
    );
    const meta: SourceMeta = { ...(source.meta as SourceMeta), digest };
    await setSourceMeta(source.id, meta);
    return { sections: digest.length };
  });

  await setSourceStatus(source.id, 'ready');
};

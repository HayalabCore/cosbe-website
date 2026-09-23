import { embedTexts } from '@/ai/generate';
import { embeddingSpec } from '@/ai/models';
import { prisma } from '@/lib/prisma';
import type { ContentBlock } from '@/types';
import type { RunExecutor } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { articleToSegments } from '../sources/article-text';
import {
  digestGroup,
  digestGroups,
  VERSION as DIGEST_VERSION,
} from '../sources/digest';
import type { DigestSection, SourceMeta } from '../sources/source-types';
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
  ensureBudget,
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
  // The step stores segment boundaries so a retry never re-reads a live
  // article that may have changed since its text snapshot was taken.
  const extracted = await step('extract', 0, async () => {
    const { text, segments } = await extract(source);
    if (!text.trim()) return fail(source.id, 'The source has no text.');
    await setSourceText(source.id, {
      text,
      language: detectLanguage(text),
      contentHash: contentHash(text),
    });
    return {
      charCount: text.length,
      segments: segments.map((g) => ({
        start: g.start,
        end: g.start + g.text.length,
        locator: g.locator,
      })),
    };
  });

  const stored = await getSource(source.id);
  if (!stored) throw new NonRetryableRunError('The source no longer exists.');
  const text = stored.text;
  if (!text) throw new NonRetryableRunError('The source text is missing.');
  // An extract step recorded before boundaries were stored: one segment.
  const bounds = extracted.segments ?? [
    { start: 0, end: text.length, locator: {} },
  ];
  const segments: Segment[] = bounds.map((g) => ({
    text: text.slice(g.start, g.end),
    start: g.start,
    locator: g.locator,
  }));
  const chunks = chunkSegments(segments);
  await step('chunk-embed', 1, async () => {
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => c.text);
      vectors.push(
        ...(await embedTexts(batch, {
          onUsage: recordUsage,
          signal,
          ensureBudget,
        }))
      );
    }
    await replaceChunks(
      source.id,
      chunks.map((c, i) => ({ ...c, embedding: vectors[i] })),
      embeddingSpec().modelId
    );
    return { chunkCount: chunks.length };
  });

  // One step per group: a long source resumes where its digest stopped
  // instead of repeating every model call within one job's time limit.
  const groups = digestGroups(
    chunks.map((c) => ({
      ordinal: c.ordinal,
      text: c.text,
      label: String(c.locator.chapter ?? c.locator.blockId ?? 'all'),
    }))
  );
  const digest: DigestSection[] = [];
  for (const [index, group] of groups.entries()) {
    digest.push(
      await step(
        `digest:${index}`,
        2 + index,
        () =>
          digestGroup(group, { onUsage: recordUsage, signal, ensureBudget }),
        { promptVersion: DIGEST_VERSION }
      )
    );
  }
  await step('digest', 2 + groups.length, async () => {
    const meta: SourceMeta = { ...(source.meta as SourceMeta), digest };
    await setSourceMeta(source.id, meta);
    return { sections: digest.length };
  });

  await setSourceStatus(source.id, 'ready');
};

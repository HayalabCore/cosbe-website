import 'server-only';

import {
  translateStringsToEnglish,
  translateToEnglish,
} from '@/lib/openai-translate';
import { stripHtmlForMetrics } from '@/lib/sanitize-article-html';
import type { ContentBlock } from '@/types';
import {
  applyBlockTranslation,
  blockToTranslatePayload,
  hasTranslatablePrimaryContent,
  isTranslatableBlock,
  type BlockTranslationError,
  type TranslateBlockPayload,
  type TranslateBlockResult,
} from '@/lib/block-translation-utils';

export type {
  BlockTranslationError,
  TranslateBlockPayload,
  TranslateBlockResult,
} from '@/lib/block-translation-utils';

export async function translateBlockPayload(
  payload: TranslateBlockPayload
): Promise<TranslateBlockResult> {
  switch (payload.type) {
    case 'heading': {
      const contentEn = await translateToEnglish(payload.content);
      return { type: 'heading', contentEn };
    }
    case 'paragraph': {
      const plain = stripHtmlForMetrics(payload.contentHtml);
      const contentEn = await translateToEnglish(plain);
      return { type: 'paragraph', contentEn };
    }
    case 'list': {
      const itemsEn = await translateStringsToEnglish(payload.items);
      return { type: 'list', itemsEn };
    }
    case 'quote': {
      const contentEn = await translateToEnglish(payload.content);
      let citationEn: string | undefined;
      if (payload.citation?.trim()) {
        citationEn = await translateToEnglish(payload.citation);
      }
      return { type: 'quote', contentEn, citationEn };
    }
    case 'callout': {
      const contentEn = await translateToEnglish(payload.content);
      let titleEn: string | undefined;
      if (payload.title?.trim()) {
        titleEn = await translateToEnglish(payload.title);
      }
      return { type: 'callout', titleEn, contentEn };
    }
    case 'image': {
      const altEn = await translateToEnglish(payload.alt);
      let captionEn: string | undefined;
      if (payload.caption?.trim()) {
        captionEn = await translateToEnglish(payload.caption);
      }
      return { type: 'image', altEn, captionEn };
    }
    case 'embed': {
      if (!payload.title?.trim()) {
        return { type: 'embed', titleEn: '' };
      }
      const titleEn = await translateToEnglish(payload.title);
      return { type: 'embed', titleEn };
    }
    case 'table': {
      const headersEn = await translateStringsToEnglish(payload.headers);
      const rowsEn = await Promise.all(
        payload.rows.map((row) => translateStringsToEnglish(row))
      );
      let titleEn: string | undefined;
      if (payload.title?.trim()) {
        titleEn = await translateToEnglish(payload.title);
      }
      let subtitleEn: string | undefined;
      if (payload.subtitle?.trim()) {
        subtitleEn = await translateToEnglish(payload.subtitle);
      }
      let captionEn: string | undefined;
      if (payload.caption?.trim()) {
        captionEn = await translateToEnglish(payload.caption);
      }
      return {
        type: 'table',
        titleEn,
        subtitleEn,
        headersEn,
        rowsEn,
        captionEn,
      };
    }
  }
}

const DEFAULT_CONCURRENCY = 4;

export async function translateBlocksWithConcurrency(
  blocks: ContentBlock[],
  concurrency = DEFAULT_CONCURRENCY
): Promise<{
  blocks: ContentBlock[];
  errors: BlockTranslationError[];
}> {
  const translatable = blocks.filter(
    (b) => isTranslatableBlock(b) && hasTranslatablePrimaryContent(b)
  );

  const resultById = new Map<string, TranslateBlockResult>();
  const errors: BlockTranslationError[] = [];

  for (let i = 0; i < translatable.length; i += concurrency) {
    const batch = translatable.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (block) => {
        const payload = blockToTranslatePayload(block);
        if (!payload) {
          throw new Error('Block has no translatable content');
        }
        const result = await translateBlockPayload(payload);
        return { blockId: block.id, result };
      })
    );

    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      const block = batch[j];
      if (outcome.status === 'fulfilled') {
        resultById.set(outcome.value.blockId, outcome.value.result);
      } else {
        const message =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : 'Translation failed';
        errors.push({ blockId: block.id, message });
      }
    }
  }

  const nextBlocks = blocks.map((block) => {
    const result = resultById.get(block.id);
    if (!result) return block;
    return applyBlockTranslation(block, result);
  });

  return { blocks: nextBlocks, errors };
}

export async function translateArticleMetaParts(parts: {
  title: string;
  excerpt?: string;
}): Promise<{ titleEn: string; excerptEn?: string }> {
  const titleEn = await translateToEnglish(parts.title);
  let excerptEn: string | undefined;
  if (parts.excerpt?.trim()) {
    excerptEn = await translateToEnglish(parts.excerpt);
  }
  return { titleEn, excerptEn };
}

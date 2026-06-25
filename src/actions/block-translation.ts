'use server';

import {
  translateArticleMetaParts,
  translateBlockPayload,
  translateBlocksWithConcurrency,
  type BlockTranslationError,
  type TranslateBlockPayload,
  type TranslateBlockResult,
} from '@/lib/block-translation-server';
import { requireUser } from '@/lib/require-user';
import type { ContentBlock } from '@/types';

export type {
  TranslateBlockPayload,
  TranslateBlockResult,
} from '@/lib/block-translation-server';

export async function translateBlockEnAction(
  payload: TranslateBlockPayload
): Promise<TranslateBlockResult> {
  await requireUser();
  return translateBlockPayload(payload);
}

export async function translateArticleMetaEnAction(parts: {
  title: string;
  excerpt?: string;
}): Promise<{ titleEn: string; excerptEn?: string }> {
  await requireUser();
  return translateArticleMetaParts(parts);
}

export type TranslateArticleEnResult = {
  titleEn: string;
  excerptEn?: string;
  blocks: ContentBlock[];
  errors: BlockTranslationError[];
};

export async function translateArticleEnAction(parts: {
  title: string;
  excerpt?: string;
  blocks: ContentBlock[];
}): Promise<TranslateArticleEnResult> {
  await requireUser();

  const errors: BlockTranslationError[] = [];

  let titleEn = '';
  let excerptEn: string | undefined;

  if (parts.title.trim()) {
    try {
      const meta = await translateArticleMetaParts({
        title: parts.title,
        excerpt: parts.excerpt,
      });
      titleEn = meta.titleEn;
      excerptEn = meta.excerptEn;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Translation failed';
      errors.push({ blockId: '__meta__', message });
    }
  }

  const { blocks, errors: blockErrors } = await translateBlocksWithConcurrency(
    parts.blocks
  );

  return {
    titleEn,
    excerptEn,
    blocks,
    errors: [...errors, ...blockErrors],
  };
}

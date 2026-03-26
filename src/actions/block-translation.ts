'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  translateStringsToEnglish,
  translateToEnglish,
} from '@/lib/openai-translate';
import { stripHtmlForMetrics } from '@/lib/sanitize-article-html';
async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export type TranslateBlockPayload =
  | { type: 'heading'; content: string }
  | { type: 'paragraph'; contentHtml: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; content: string; citation?: string }
  | { type: 'callout'; title?: string; content: string }
  | { type: 'image'; alt: string; caption?: string }
  | { type: 'embed'; title?: string };

export type TranslateBlockResult =
  | { type: 'heading'; contentEn: string }
  | { type: 'paragraph'; contentEn: string }
  | { type: 'list'; itemsEn: string[] }
  | { type: 'quote'; contentEn: string; citationEn?: string }
  | { type: 'callout'; titleEn?: string; contentEn: string }
  | { type: 'image'; altEn: string; captionEn?: string }
  | { type: 'embed'; titleEn?: string };

export async function translateBlockEnAction(
  payload: TranslateBlockPayload
): Promise<TranslateBlockResult> {
  await requireUser();

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
  }
}

export async function translateArticleMetaEnAction(parts: {
  title: string;
  excerpt?: string;
}): Promise<{ titleEn: string; excerptEn?: string }> {
  await requireUser();
  const titleEn = await translateToEnglish(parts.title);
  let excerptEn: string | undefined;
  if (parts.excerpt?.trim()) {
    excerptEn = await translateToEnglish(parts.excerpt);
  }
  return { titleEn, excerptEn };
}

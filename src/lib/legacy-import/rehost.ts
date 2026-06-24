import { createHash } from 'crypto';
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentBlock } from '@/types';
import { ImageRehostError } from './types';

const BUCKET = 'article-images';

function extFromContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'CosBE-Importer/1.0' },
    });
    const contentType = String(res.headers['content-type'] ?? '');
    if (!contentType.startsWith('image/')) return null;
    return { buffer: Buffer.from(res.data), contentType };
  } catch {
    return null;
  }
}

async function uploadBuffer(
  supabase: SupabaseClient,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const ext = extFromContentType(contentType);
  const path = `imported/${hash}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export type RehostResult = {
  featuredImageUrl: string | null;
  blocks: ContentBlock[];
  warnings: string[];
};

export async function rehostImportImages(
  supabase: SupabaseClient,
  featuredImageRemoteUrl: string | null,
  blocks: ContentBlock[]
): Promise<RehostResult> {
  const warnings: string[] = [];
  const urlMap = new Map<string, string>();

  const uniqueUrls = new Set<string>();
  if (featuredImageRemoteUrl) uniqueUrls.add(featuredImageRemoteUrl);
  for (const b of blocks) {
    if (b.type === 'image' && b.url) uniqueUrls.add(b.url);
  }

  const urls = [...uniqueUrls];

  await mapConcurrent(urls, 4, async (remoteUrl) => {
    const downloaded = await downloadImage(remoteUrl);
    if (!downloaded) {
      warnings.push(`Could not rehost image: ${remoteUrl}`);
      return;
    }
    try {
      const publicUrl = await uploadBuffer(
        supabase,
        downloaded.buffer,
        downloaded.contentType
      );
      urlMap.set(remoteUrl, publicUrl);
    } catch {
      warnings.push(`Upload failed for image: ${remoteUrl}`);
    }
  });

  const failedUrls = urls.filter((url) => !urlMap.has(url));
  if (failedUrls.length > 0) {
    throw new ImageRehostError(
      `Failed to rehost ${failedUrls.length} image(s). Import aborted to avoid legacy hotlinks.`,
      failedUrls
    );
  }

  const featuredImageUrl = featuredImageRemoteUrl
    ? (urlMap.get(featuredImageRemoteUrl) ?? null)
    : null;

  const rehostedBlocks = blocks.map((b) => {
    if (b.type !== 'image') return b;
    const mapped = urlMap.get(b.url);
    if (!mapped) {
      throw new ImageRehostError(
        `Missing rehosted URL for block image: ${b.url}`,
        [b.url]
      );
    }
    return { ...b, url: mapped };
  });

  return { featuredImageUrl, blocks: rehostedBlocks, warnings };
}

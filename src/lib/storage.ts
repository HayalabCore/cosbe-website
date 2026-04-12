import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'article-images';

export type GalleryUploadResult = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

export function publicUrlToStoragePath(
  publicUrl: string,
  bucket: string = BUCKET
): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

export async function uploadToGallery(
  supabase: SupabaseClient,
  file: File
): Promise<GalleryUploadResult> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = `gallery/${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: pub.publicUrl,
    filename: file.name || safeName,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
}

export async function deleteFromGallery(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  const storagePath = publicUrlToStoragePath(publicUrl);
  if (!storagePath) throw new Error('Invalid storage URL');
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}

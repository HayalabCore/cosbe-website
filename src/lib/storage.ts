import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'article-images';

export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  articleId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = `${articleId}/${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

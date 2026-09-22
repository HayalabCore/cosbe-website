import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const STUDIO_SOURCES_BUCKET = 'studio-sources';
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

function bucket() {
  return getSupabaseAdminClient().storage.from(STUDIO_SOURCES_BUCKET);
}

export function pdfStoragePath(sourceId: string, filename: string): string {
  const base = filename
    .replace(/\.pdf$/i, '')
    .split(/[\\/]/)
    .pop()!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `pdf/${sourceId}/${base || 'document'}.pdf`;
}

export async function createPdfUploadUrl(
  path: string
): Promise<{ path: string; token: string }> {
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data)
    throw new Error(error?.message ?? 'Could not sign upload');
  return { path: data.path, token: data.token };
}

export async function pdfObjectExists(path: string): Promise<boolean> {
  const folder = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { data, error } = await bucket().list(folder, { search: name });
  if (error) throw new Error(error.message);
  return (data ?? []).some((object) => object.name === name);
}

export async function removeSourceObject(path: string): Promise<void> {
  const { error } = await bucket().remove([path]);
  if (error) throw new Error(error.message);
}

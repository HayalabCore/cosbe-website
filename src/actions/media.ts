'use server';

import { revalidatePath } from 'next/cache';
import {
  createMediaRecord,
  deleteMediaRecord,
  getMediaById,
} from '@/lib/media-repository';
import { requireUser } from '@/lib/require-user';
import { deleteFromGallery } from '@/lib/storage';
import type { CreateMediaInput } from '@/lib/media-repository';

export async function recordMediaAction(data: CreateMediaInput) {
  await requireUser();
  const row = await createMediaRecord(data);
  revalidatePath('/admin/media');
  return row;
}

export async function deleteMediaAction(id: string) {
  const { supabase } = await requireUser();
  const row = await getMediaById(id);
  if (!row) throw new Error('Not found');
  const url = row.url;
  await deleteMediaRecord(id);
  try {
    await deleteFromGallery(supabase, url);
  } catch {
    /* Row is gone; object may remain in bucket until manual cleanup. */
  }
  revalidatePath('/admin/media');
}

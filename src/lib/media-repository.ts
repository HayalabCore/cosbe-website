import { prisma } from '@/lib/prisma';

export type MediaListItem = {
  id: string;
  filename: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  alt: string;
  createdAt: Date;
};

export type CreateMediaInput = {
  filename: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  alt?: string;
};

export async function createMediaRecord(data: CreateMediaInput) {
  return prisma.mediaLibrary.create({
    data: {
      filename: data.filename,
      url: data.url,
      size: data.size ?? null,
      mimeType: data.mimeType ?? null,
      alt: data.alt ?? '',
    },
  });
}

export async function getMediaById(id: string) {
  return prisma.mediaLibrary.findUnique({ where: { id } });
}

export async function listMedia(options: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<MediaListItem[]> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 24));
  const search = options.search?.trim();

  const where =
    search && search.length > 0
      ? {
          OR: [
            { filename: { contains: search, mode: 'insensitive' as const } },
            { url: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

  const rows = await prisma.mediaLibrary.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return rows;
}

export async function countMedia(options: {
  search?: string;
}): Promise<number> {
  const search = options.search?.trim();
  const where =
    search && search.length > 0
      ? {
          OR: [
            { filename: { contains: search, mode: 'insensitive' as const } },
            { url: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

  return prisma.mediaLibrary.count({ where });
}

export async function deleteMediaRecord(id: string) {
  return prisma.mediaLibrary.delete({ where: { id } });
}

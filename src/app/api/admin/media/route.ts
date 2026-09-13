import { NextResponse } from 'next/server';
import { countMedia, listMedia } from '@/lib/media-repository';
import {
  FORBIDDEN_ERROR,
  requireAnyPermission,
  UNAUTHORIZED_ERROR,
} from '@/lib/authz';

export async function GET(request: Request) {
  try {
    // Media page (media.upload) and the editor's gallery picker (articles.edit).
    await requireAnyPermission('media.upload', 'articles.edit');
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHORIZED_ERROR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === FORBIDDEN_ERROR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/admin/media]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get('pageSize')) || 24)
  );

  const [items, total] = await Promise.all([
    listMedia({ search, page, pageSize }),
    countMedia({ search }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      filename: m.filename,
      url: m.url,
      size: m.size,
      mimeType: m.mimeType,
      alt: m.alt,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages,
  });
}

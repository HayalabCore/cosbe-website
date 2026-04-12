import { NextResponse } from 'next/server';
import { countMedia, listMedia } from '@/lib/media-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

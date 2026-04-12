import { NextResponse } from 'next/server';

import { articleCreateApiMetadata } from '@/lib/api/article-create-metadata';

export async function GET() {
  return NextResponse.json(articleCreateApiMetadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

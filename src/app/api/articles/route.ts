import { timingSafeEqual } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { revalidateArticlePaths } from '@/lib/article-revalidation';
import { createArticleRecord } from '@/lib/articles';
import {
  createArticleSchema,
  toCreateArticlePayload,
  zodErrorDetails,
} from '@/lib/validation/article';

function parseBearerToken(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const t = header.slice(7).trim();
  return t.length ? t : null;
}

function apiKeyMatches(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(token, 'utf8'),
      Buffer.from(secret, 'utf8')
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.API_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'Service unavailable', details: ['API is not configured'] },
      { status: 503 }
    );
  }

  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token || !apiKeyMatches(token, secret)) {
    return NextResponse.json(
      { error: 'Unauthorized', details: ['Invalid or missing API key'] },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', details: ['Body must be valid JSON'] },
      { status: 400 }
    );
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', details: zodErrorDetails(parsed.error) },
      { status: 400 }
    );
  }

  const data = toCreateArticlePayload(parsed.data);

  try {
    const id = await createArticleRecord(data);
    revalidateArticlePaths(data.slug, data.category);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error: 'Conflict',
          details: ['An article with this slug already exists'],
        },
        { status: 409 }
      );
    }
    console.error('[POST /api/articles]', e);
    return NextResponse.json(
      { error: 'Internal Server Error', details: ['Failed to create article'] },
      { status: 500 }
    );
  }
}

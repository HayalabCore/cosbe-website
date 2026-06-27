-- Admin dashboard: order by created_at and fast ILIKE search on title/title_en/slug.

-- Ordering index (matches @@index([createdAt(sort: Desc)]) in schema.prisma).
CREATE INDEX IF NOT EXISTS "articles_created_at_idx" ON "articles" ("created_at" DESC);

-- Trigram substring search. Managed as raw SQL because the GIN indexes need the
-- gin_trgm_ops opclass, which Prisma's schema DSL can't express directly.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "articles_title_trgm_idx"    ON "articles" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "articles_title_en_trgm_idx" ON "articles" USING gin ("title_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "articles_slug_trgm_idx"     ON "articles" USING gin ("slug" gin_trgm_ops);

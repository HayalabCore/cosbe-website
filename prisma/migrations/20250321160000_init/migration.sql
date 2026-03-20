-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "featured_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "author" JSONB NOT NULL,
    "blocks" JSONB NOT NULL,
    "toc" JSONB NOT NULL,
    "seo" JSONB,
    "related_article_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

CREATE INDEX "articles_status_category_published_at_idx" ON "articles"("status", "category", "published_at" DESC NULLS LAST);

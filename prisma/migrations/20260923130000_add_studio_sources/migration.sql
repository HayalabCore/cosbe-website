-- CreateTable
CREATE TABLE "studio_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "title" TEXT NOT NULL,
    "language" TEXT,
    "origin_url" TEXT,
    "youtube_video_id" TEXT,
    "storage_path" TEXT,
    "article_id" UUID,
    "text" TEXT,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "content_hash" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_sources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_sources_kind_check" CHECK ("kind" IN ('text', 'article', 'pdf', 'youtube')),
    CONSTRAINT "studio_sources_status_check" CHECK ("status" IN ('pending', 'processing', 'ready', 'stored', 'needs_transcript', 'failed'))
);

-- CreateTable
CREATE TABLE "studio_source_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "locator" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1536),
    "embedding_model" TEXT,

    CONSTRAINT "studio_source_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_by" UUID,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_project_sources" (
    "project_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "added_by" UUID,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_project_sources_pkey" PRIMARY KEY ("project_id","source_id")
);

-- CreateIndex
CREATE INDEX "studio_sources_status_idx" ON "studio_sources"("status");
CREATE INDEX "studio_sources_created_at_idx" ON "studio_sources"("created_at" DESC);
CREATE UNIQUE INDEX "studio_source_chunks_source_id_ordinal_key" ON "studio_source_chunks"("source_id", "ordinal");
CREATE INDEX "studio_project_sources_source_id_idx" ON "studio_project_sources"("source_id");

-- Retrieval indexes (not modelled by Prisma)
CREATE INDEX "studio_source_chunks_embedding_hnsw_idx" ON "studio_source_chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "studio_source_chunks_text_pgroonga_idx" ON "studio_source_chunks" USING pgroonga ("text");

-- AddForeignKey
ALTER TABLE "studio_sources" ADD CONSTRAINT "studio_sources_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_sources" ADD CONSTRAINT "studio_sources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_source_chunks" ADD CONSTRAINT "studio_source_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "studio_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_project_sources" ADD CONSTRAINT "studio_project_sources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_project_sources" ADD CONSTRAINT "studio_project_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "studio_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_runs" ADD CONSTRAINT "studio_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "studio_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Block Supabase Data API access; Prisma (table owner) is unaffected.
ALTER TABLE "studio_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_source_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_project_sources" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "media_library" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mime_type" TEXT,
    "alt" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_library_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_library_url_key" ON "media_library"("url");

-- CreateIndex
CREATE INDEX "media_library_created_at_idx" ON "media_library"("created_at" DESC);

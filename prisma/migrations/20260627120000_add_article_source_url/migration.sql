-- Track the legacy URL an article was imported from (null for non-imported posts).
ALTER TABLE "articles" ADD COLUMN "source_url" TEXT;

-- Studio pieces can be archived (hidden from the list, read-only) and later
-- restored or deleted, like posts. Deleting a piece never touches its post.
ALTER TABLE "studio_pieces" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "translations" ADD COLUMN     "is_orphaned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "translations_is_orphaned_idx" ON "translations"("is_orphaned");

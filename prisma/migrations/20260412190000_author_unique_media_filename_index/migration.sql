-- CreateIndex
CREATE UNIQUE INDEX "authors_name_designation_key" ON "authors"("name", "designation");

-- CreateIndex
CREATE INDEX "media_library_filename_idx" ON "media_library"("filename");

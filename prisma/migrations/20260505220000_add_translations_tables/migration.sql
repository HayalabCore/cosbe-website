-- CreateTable
CREATE TABLE "translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key_path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key_path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "previous_value" TEXT NOT NULL,
    "changed_by" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_path_locale_key" ON "translations"("key_path", "locale");

-- CreateIndex
CREATE INDEX "translations_locale_namespace_idx" ON "translations"("locale", "namespace");

-- CreateIndex
CREATE INDEX "translation_history_key_path_locale_changed_at_idx" ON "translation_history"("key_path", "locale", "changed_at" DESC);

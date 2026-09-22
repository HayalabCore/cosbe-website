-- CreateTable
CREATE TABLE "studio_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "piece_id" UUID,
    "source_id" UUID,
    "input" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "token_ceiling" INTEGER,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "studio_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_runs_status_check" CHECK ("status" IN ('queued', 'running', 'succeeded', 'failed', 'cancelled'))
);

-- CreateTable
CREATE TABLE "studio_run_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "studio_run_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_run_steps_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed'))
);

-- CreateIndex
CREATE INDEX "studio_runs_piece_id_created_at_idx" ON "studio_runs"("piece_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_runs_status_idx" ON "studio_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_run_steps_run_id_key_key" ON "studio_run_steps"("run_id", "key");

-- AddForeignKey
ALTER TABLE "studio_runs" ADD CONSTRAINT "studio_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_run_steps" ADD CONSTRAINT "studio_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "studio_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma creates these in "public", which the Supabase Data API exposes.
-- RLS with no policies blocks anon/authenticated API access; Prisma connects
-- as the table owner and is unaffected.
ALTER TABLE "studio_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_run_steps" ENABLE ROW LEVEL SECURITY;

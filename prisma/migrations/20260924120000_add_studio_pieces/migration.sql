CREATE TABLE "studio_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL,
    "default_category" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_pieces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "template_id" UUID,
    "stage" TEXT NOT NULL DEFAULT 'sources',
    "title" TEXT NOT NULL DEFAULT '',
    "title_en" TEXT,
    "excerpt" TEXT,
    "excerpt_en" TEXT,
    "seo" JSONB,
    "brief" JSONB NOT NULL DEFAULT '{}',
    "selection" JSONB NOT NULL DEFAULT '{}',
    "outline" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'useful-info',
    "author_id" UUID,
    "article_id" UUID,
    "handed_off_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_pieces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_pieces_stage_check" CHECK ("stage" IN ('sources', 'brief', 'outline', 'writing', 'review', 'translating', 'ready', 'handed_off'))
);

CREATE TABLE "studio_piece_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "piece_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "run_id" UUID,
    "stage" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_piece_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "studio_pieces_project_id_updated_at_idx" ON "studio_pieces"("project_id", "updated_at" DESC);
CREATE INDEX "studio_pieces_updated_at_idx" ON "studio_pieces"("updated_at" DESC);
CREATE INDEX "studio_piece_snapshots_piece_id_created_at_idx" ON "studio_piece_snapshots"("piece_id", "created_at" DESC);

ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "studio_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_piece_snapshots" ADD CONSTRAINT "studio_piece_snapshots_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "studio_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_runs" ADD CONSTRAINT "studio_runs_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "studio_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "studio_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_pieces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "studio_piece_snapshots" ENABLE ROW LEVEL SECURITY;

-- Default templates (editable in the UI by studio.templates.manage).
INSERT INTO "studio_templates" ("name", "description", "instructions", "default_category", "is_default") VALUES
  ('お役立ちコラム', 'Explanatory column for decision makers.',
   'Audience: business decision makers considering AI. Tone: clear, practical, polite (です・ます). Structure: a short introduction stating the reader''s problem, then sections that each answer one question, then a summary. Prefer concrete steps, numbers and examples from the sources. No hype, no claims the sources do not make.',
   'useful-info', true),
  ('導入事例', 'Customer case study.',
   'Audience: prospects in the same industry. Tone: factual, respectful of the customer. Structure: customer background, the challenge, what was done, results (only results stated in the sources), next steps. Quote the customer only when the sources contain the quote.',
   'case-study', false),
  ('お知らせ', 'Short company notice.',
   'Tone: concise and formal (です・ます). Structure: what is announced, when, who it affects, what readers should do. Keep it short; do not add background the sources do not give.',
   'notice', false);

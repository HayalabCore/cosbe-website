-- Per-step cost and prompt version (spec §3, §5), for the quality baseline
-- and regression analysis. Run totals stay on studio_runs.
ALTER TABLE studio_run_steps
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN tokens_in INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN tokens_out INTEGER NOT NULL DEFAULT 0;

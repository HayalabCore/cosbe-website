-- Historical metadata cannot be reconstructed: restoring old snapshots clears it.
ALTER TABLE studio_piece_snapshots
  ADD COLUMN title_en TEXT,
  ADD COLUMN excerpt TEXT,
  ADD COLUMN excerpt_en TEXT,
  ADD COLUMN seo JSONB;

-- One active run per piece, regardless of queue/kind. Existing duplicates must
-- be resolved before deployment; do not silently discard an editor's work.
CREATE UNIQUE INDEX studio_runs_one_active_piece
  ON studio_runs (piece_id)
  WHERE piece_id IS NOT NULL AND status IN ('queued', 'running');

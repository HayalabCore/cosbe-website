-- Older snapshots leave these null. Restore then keeps the piece's current
-- selection and brief, because the historical values cannot be reconstructed.
ALTER TABLE studio_piece_snapshots
  ADD COLUMN selection JSONB,
  ADD COLUMN brief JSONB;

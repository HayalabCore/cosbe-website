-- Content Studio retrieval: pgvector (semantic) and PGroonga (keyword search
-- that works for Japanese). Both are on Supabase's extension allowlist, so the
-- non-superuser postgres role can create them.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgroonga;

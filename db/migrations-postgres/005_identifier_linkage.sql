-- KOBIS↔KMDb 식별자 연결 (PostgreSQL) — db/migrations/005_identifier_linkage.sql과 동일 구조
CREATE TABLE movie_identifier_candidates (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  kmdb_docid TEXT NOT NULL,
  kmdb_title TEXT NOT NULL,
  match_tier TEXT NOT NULL CHECK (match_tier IN ('exact','high_confidence','needs_review','conflict','unmatched')),
  match_signals TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  auto_linked INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (movie_id, kmdb_docid)
);
CREATE INDEX ix_movie_identifier_candidates_movie ON movie_identifier_candidates (movie_id, status);
CREATE INDEX ix_movie_identifier_candidates_status ON movie_identifier_candidates (status, created_at DESC);

-- KOBIS↔KMDb 식별자 연결 — 매 실행마다 발견된 후보를 전부 기록한다(불변에 가까움, 검토
-- 상태만 바뀐다). exact/high_confidence 단독 후보는 자동으로 movies.kmdb_docid를 채우고,
-- needs_review/conflict/unmatched 또는 동점 후보는 관리자 검토 대기(status='pending')로 남는다.
CREATE TABLE movie_identifier_candidates (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  kmdb_docid TEXT NOT NULL,
  kmdb_title TEXT NOT NULL,
  match_tier TEXT NOT NULL CHECK (match_tier IN ('exact','high_confidence','needs_review','conflict','unmatched')),
  match_signals TEXT NOT NULL, -- JSON {titleMatch, directorMatch, yearDiff}
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  auto_linked INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (movie_id, kmdb_docid)
);
CREATE INDEX ix_movie_identifier_candidates_movie ON movie_identifier_candidates (movie_id, status);
CREATE INDEX ix_movie_identifier_candidates_status ON movie_identifier_candidates (status, created_at DESC);

-- 개인정보 삭제 요청 (PostgreSQL) — db/migrations/007_privacy_requests.sql과 동일 구조
CREATE TABLE privacy_deletion_requests (
  id SERIAL PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('session','email')),
  session_id TEXT,
  contact_email TEXT,
  message TEXT,
  requester_session_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution_note TEXT,
  affected_summary TEXT
);
CREATE INDEX ix_privacy_requests_status ON privacy_deletion_requests (status, requested_at DESC);

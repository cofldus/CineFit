-- 비공개 알파 초대 코드 + 참여 동의 (PostgreSQL) — db/migrations/006_private_alpha.sql과 동일 구조
CREATE TABLE invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE invite_code_redemptions (
  id SERIAL PRIMARY KEY,
  invite_code_id INTEGER NOT NULL REFERENCES invite_codes(id),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  redeemed_at TEXT NOT NULL,
  UNIQUE (invite_code_id, session_id)
);
CREATE INDEX ix_invite_redemptions_session ON invite_code_redemptions (session_id);

CREATE TABLE alpha_consents (
  session_id TEXT PRIMARY KEY REFERENCES analytics_sessions(id),
  consented_at TEXT NOT NULL
);

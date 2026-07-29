-- 비공개 알파 초대 코드 + 참여 동의. 실제 알파 시작 전까지는 feature_flags의
-- 'private_alpha_gate'가 꺼진 채로 시드돼(db/seed-feature-flags.mjs) 앱 전체가 지금처럼
-- 열려 있다 — 관리자가 명시적으로 켜야만 미들웨어가 이 테이블들을 실제로 강제한다.
CREATE TABLE invite_codes (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER, -- NULL = 무제한
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT, -- NULL = 만료 없음
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE invite_code_redemptions (
  id INTEGER PRIMARY KEY,
  invite_code_id INTEGER NOT NULL REFERENCES invite_codes(id),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  redeemed_at TEXT NOT NULL,
  UNIQUE (invite_code_id, session_id)
);
CREATE INDEX ix_invite_redemptions_session ON invite_code_redemptions (session_id);

-- 알파 참여 동의 — 세션당 하나. 이 행이 없으면 분석 이벤트·설문 참여를 활성화하지 않는다
-- (private_alpha_gate가 켜져 있을 때만 강제 — 꺼져 있으면 기존 7차 마일스톤 동작 그대로).
CREATE TABLE alpha_consents (
  session_id TEXT PRIMARY KEY REFERENCES analytics_sessions(id),
  consented_at TEXT NOT NULL
);

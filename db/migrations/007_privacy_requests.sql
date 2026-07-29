-- 개인정보 삭제 요청 (docs/DATA-RETENTION.md·docs/PRIVACY-BETA.md의 "삭제 요청 창구 없음" gap 해소)
-- session 유형: 본인 세션 쿠키에 딸린 이용 데이터 전체 삭제. email 유형: 제보에 남긴
-- 연락 이메일(issue_reports.contact_email) 삭제. 둘 다 관리자가 검토 후 실행한다 — 자동 즉시
-- 실행하지 않는 이유는 감사 로그를 남기고, 오남용(잘못된 세션 id·이메일 오타)을 거를 여지를
-- 두기 위해서다.
CREATE TABLE privacy_deletion_requests (
  id INTEGER PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('session','email')),
  session_id TEXT,               -- request_type='session'일 때만
  contact_email TEXT,            -- request_type='email'일 때만
  message TEXT,                  -- 요청자가 남긴 자유 메모(선택)
  requester_session_hash TEXT NOT NULL, -- 남용 방지용 회전 해시(issue_reports.anonymous_session_hash와 동일 방식)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution_note TEXT,
  affected_summary TEXT           -- JSON — 처리 후 영향받은 행 수/이메일 목록
);
CREATE INDEX ix_privacy_requests_status ON privacy_deletion_requests (status, requested_at DESC);

-- 사실형 사용자 제보 + 감사 로그 + 좌석 존 계보(lineage) 필드 (PostgreSQL)

CREATE TABLE issue_reports (
  id SERIAL PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('seat_zone','auditorium_spec','renovation','accessibility','operational_status','showtime','booking_link','other')),
  target_type TEXT NOT NULL CHECK (target_type IN ('auditorium','showtime')),
  target_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','needs_more_information','approved_as_observation','promoted','rejected','duplicate')),
  summary TEXT NOT NULL,
  claimed_value_json TEXT NOT NULL,
  evidence_url TEXT,
  observed_at TEXT,
  submitted_at TEXT NOT NULL,
  anonymous_session_hash TEXT NOT NULL,
  contact_email TEXT,
  source_type TEXT NOT NULL DEFAULT 'user_report',
  moderator_note TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution TEXT,
  promoted_observation_id INTEGER REFERENCES observations(id),
  promoted_entity_type TEXT,
  promoted_entity_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX ix_issue_reports_status ON issue_reports (status, created_at DESC);
CREATE INDEX ix_issue_reports_target ON issue_reports (target_type, target_id);
CREATE INDEX ix_issue_reports_session ON issue_reports (anonymous_session_hash, created_at DESC);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_audit_logs ON audit_logs (target_type, target_id, created_at DESC);

ALTER TABLE seat_zones ADD COLUMN valid_from TEXT;
ALTER TABLE seat_zones ADD COLUMN valid_to TEXT;
ALTER TABLE seat_zones ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE seat_zones ADD COLUMN supersedes_seat_zone_id INTEGER REFERENCES seat_zones(id);
ALTER TABLE seat_zones ADD COLUMN source_observation_id INTEGER REFERENCES observations(id);
ALTER TABLE seat_zones ADD COLUMN reviewed_at TEXT;

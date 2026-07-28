-- 좌석 존: "명당"은 단일 좌표가 아니라 목적별 구역으로만 저장한다 (docs/06 §3.2 seat_zones)
CREATE TABLE IF NOT EXISTS seat_zones (
  id INTEGER PRIMARY KEY,
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  purpose TEXT NOT NULL,        -- JSON array: immersive/overview/subtitle/sound/low_motion/neck_easy/exit_easy/pair/wheelchair
  row_range TEXT,               -- 예: "H~K열"
  col_range TEXT,               -- 예: "중앙 블록"
  rationale TEXT,               -- 근거 설명
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL,    -- 좌석 존은 실측 불가 — official 금지, user_report/estimated 위주
  observed_at TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1)
);
CREATE INDEX IF NOT EXISTS ix_seat_zones ON seat_zones (auditorium_id);

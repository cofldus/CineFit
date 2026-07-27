-- 두 번째 마일스톤: 외부 동기화 관찰 로그 + 공식 포맷 버전 + 관리자 회차 운영 필드

-- 회차 운영 필드 (관리자 수동 입력·비활성화·합성 구분)
ALTER TABLE showtimes ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE showtimes ADD COLUMN is_synthetic INTEGER NOT NULL DEFAULT 1;
ALTER TABLE showtimes ADD COLUMN admin_note TEXT;
ALTER TABLE showtimes ADD COLUMN verified_at TEXT;
ALTER TABLE showtimes ADD COLUMN format_mismatch_note TEXT;

-- 회차 변경 이력 (완전 삭제 대신 비활성화 + 이력 — 불변)
CREATE TABLE showtime_changes (
  id INTEGER PRIMARY KEY,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','disable','enable','duplicate')),
  changes TEXT, -- JSON diff
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_showtime_changes ON showtime_changes (showtime_id, created_at DESC);

-- 배급 포맷 버전 — 출처·상태·확인일 포함 (KOBIS showTypes 등)
CREATE TABLE movie_format_versions (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  raw_value TEXT NOT NULL,        -- 예: "IMAX/IMAX" (원문)
  normalized_value TEXT,          -- imax/dolby_cinema/4dx/screenx/standard/3d, 미매핑 NULL
  source_type TEXT NOT NULL,      -- official_api/official_site/admin/...
  source_name TEXT NOT NULL,      -- 예: KOBIS
  info_status TEXT NOT NULL,      -- official 등 (schema.sql info_status 8단계와 동일 어휘)
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  UNIQUE (movie_id, source_name, raw_value)
);

-- 외부 API 불변 관찰 로그 — 핵심 테이블 직접 덮어쓰기 금지, 승격 분리 (docs/06 §1)
CREATE TABLE external_observations (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,         -- kobis / kmdb ...
  external_id TEXT NOT NULL,      -- 예: KOBIS movieCd
  entity_hint TEXT,               -- 사람이 읽을 식별 힌트(제목 등)
  fetched_at TEXT NOT NULL,
  data_hash TEXT NOT NULL,        -- 정규화 값의 SHA-256 — 동일 수신 시 중복 승격 방지
  normalized TEXT NOT NULL,       -- 정규화 JSON
  raw_excerpt TEXT,               -- 필요한 최소 원문 필드만 (전체 원문 보관 안 함)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','unchanged','error')),
  promoted_at TEXT,
  error TEXT,
  diff TEXT,                      -- 직전 관찰 대비 변경 JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_extobs ON external_observations (provider, external_id, fetched_at DESC);

-- 동일 영화 중복 방지
CREATE UNIQUE INDEX ux_movies_kobis ON movies(kobis_code) WHERE kobis_code IS NOT NULL;

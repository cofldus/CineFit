-- CineFit 최소 스키마 (스파이크용 SQLite 버전)
-- 원본 설계: docs/06-data-model.md (PostgreSQL 16 + PostGIS). 스파이크 치환:
--   uuid→INTEGER PK, enum→TEXT+CHECK, jsonb→TEXT(JSON), geom→lat/lng REAL,
--   showtime_presentations는 showtimes에 병합(11개 테이블 범위 유지).
PRAGMA foreign_keys = ON;

CREATE TABLE sources (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('official_api','official_site','press','partner','admin','user_report','community','spike_seed')),
  name TEXT NOT NULL,
  url TEXT,
  terms_note TEXT,
  allowed_use TEXT,
  trust_weight REAL NOT NULL CHECK (trust_weight BETWEEN 0 AND 1)
);

CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  runtime_min INTEGER,
  rating TEXT,
  genres TEXT,             -- JSON array
  director TEXT,
  kobis_code TEXT,         -- link-identifiers 스파이크 결과 저장 위치
  kmdb_docid TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE movie_releases (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  country TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_production','upcoming','press_screened','partial_release','domestic_release','ended','rerelease_upcoming','rerelease_showing')),
  release_date TEXT,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL DEFAULT 'single_unverified',
  observed_at TEXT,
  confidence REAL,
  UNIQUE (movie_id, country, release_date)
);

CREATE TABLE movie_technical_specs (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  spec_key TEXT NOT NULL,  -- native_ar, imax_expanded_ar, filmed_for_imax, film_format, atmos_mix, imax_sound_mix, dolby_vision, dark_scene_ratio, genre_spectacle, format_versions...
  value TEXT NOT NULL,     -- JSON
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL CHECK (info_status IN ('official','multi_source','user_report','single_unverified','estimated','rumor','outdated','conflict')),
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  UNIQUE (movie_id, spec_key, source_id)
);

CREATE TABLE cinema_locations (
  id INTEGER PRIMARY KEY,
  chain TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL, lng REAL,      -- PostGIS geom 치환 (좌표는 추정치, info_status는 observations로)
  region_code TEXT,
  status TEXT NOT NULL DEFAULT 'operating' CHECK (status IN ('operating','closed','uncertain')),
  transit_note TEXT
);

CREATE TABLE auditoriums (
  id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES cinema_locations(id),
  auditorium_no TEXT NOT NULL,
  brand TEXT NOT NULL,     -- imax, dolby_cinema, superplex, 4dx, standard...
  status TEXT NOT NULL DEFAULT 'operating',
  seat_count INTEGER,
  UNIQUE (location_id, auditorium_no)
);

CREATE TABLE auditorium_specs (  -- 이력 테이블 (valid_to IS NULL = 현재 유효)
  id INTEGER PRIMARY KEY,
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  projector TEXT,          -- JSON {light_source,resolution,imax_grade,dolby_vision,dual,max_brightness_fl}
  screen TEXT,             -- JSON {width_m,height_m,aspect,curved}
  sound TEXT,              -- JSON {format,ceiling}
  supported_ar TEXT,       -- 실제 표시 가능한 최대 확장 화면비 ('1.43'|'1.90'|'2.39'|null=미확인)
  masking TEXT CHECK (masking IN ('side','top','both','none','unknown')),
  notes TEXT,
  renewal_event TEXT,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  confidence REAL NOT NULL
);
CREATE INDEX ix_aud_specs ON auditorium_specs (auditorium_id, valid_from DESC);

CREATE TABLE showtimes (   -- 스파이크: showtime_presentations 병합 (format, is_3d)
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  starts_at TEXT NOT NULL,
  ends_at_est TEXT NOT NULL,
  format TEXT NOT NULL,    -- imax_gt_143, imax_laser_190, dolby_cinema, 4dx, superplex, standard
  is_3d INTEGER NOT NULL DEFAULT 0,
  language TEXT DEFAULT 'sub',
  price_adult INTEGER,     -- 스파이크: prices 테이블 대신 성인 1인 기준가 1필드
  booking_url TEXT,
  entry_method TEXT NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual','partner','parser')),
  data_checked_at TEXT NOT NULL,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL DEFAULT 'estimated'
);
CREATE INDEX ix_showtimes_movie ON showtimes (movie_id, starts_at);

CREATE TABLE observations (  -- 불변 로그 (UPDATE 금지 — 문서 06 §6)
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,     -- JSON
  source_id INTEGER NOT NULL REFERENCES sources(id),
  observed_at TEXT NOT NULL,
  info_status TEXT NOT NULL,
  confidence REAL NOT NULL,
  superseded_by INTEGER REFERENCES observations(id)
);
CREATE INDEX ix_obs ON observations (entity_type, entity_id, field, observed_at DESC);

CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  explicit TEXT,           -- JSON (고급 설정)
  sensitivity TEXT,        -- JSON {motionSickness,loudness,brightness,neckBack}
  accessibility TEXT,      -- JSON
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE recommendation_runs (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  request TEXT NOT NULL,   -- JSON
  weights TEXT NOT NULL,   -- JSON
  results TEXT,            -- JSON (스파이크: candidates/explanations 병합 저장)
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

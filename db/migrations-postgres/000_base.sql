-- CineFit PostgreSQL 기본 스키마 — SQLite(schema.sql + 001 + 002)와 계약 동일.
-- 규칙: 타임스탬프는 ISO 8601 UTC TEXT, 불리언은 0/1 INTEGER, JSON은 TEXT (docs/DATABASE.md).

CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('official_api','official_site','press','partner','admin','user_report','community','spike_seed')),
  name TEXT NOT NULL,
  url TEXT,
  terms_note TEXT,
  allowed_use TEXT,
  trust_weight DOUBLE PRECISION NOT NULL CHECK (trust_weight BETWEEN 0 AND 1)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  runtime_min INTEGER,
  rating TEXT,
  genres TEXT,
  director TEXT,
  kobis_code TEXT,
  kmdb_docid TEXT,
  created_at TEXT
);
CREATE UNIQUE INDEX ux_movies_kobis ON movies(kobis_code) WHERE kobis_code IS NOT NULL;

CREATE TABLE movie_releases (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  country TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_production','upcoming','press_screened','partial_release','domestic_release','ended','rerelease_upcoming','rerelease_showing')),
  release_date TEXT,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL DEFAULT 'single_unverified',
  observed_at TEXT,
  confidence DOUBLE PRECISION,
  UNIQUE (movie_id, country, release_date)
);

CREATE TABLE movie_technical_specs (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  spec_key TEXT NOT NULL,
  value TEXT NOT NULL,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL CHECK (info_status IN ('official','multi_source','user_report','single_unverified','estimated','rumor','outdated','conflict')),
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  UNIQUE (movie_id, spec_key, source_id)
);

CREATE TABLE cinema_locations (
  id SERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  region_code TEXT,
  status TEXT NOT NULL DEFAULT 'operating' CHECK (status IN ('operating','closed','uncertain')),
  transit_note TEXT
);

CREATE TABLE auditoriums (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES cinema_locations(id),
  auditorium_no TEXT NOT NULL,
  brand TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operating',
  seat_count INTEGER,
  UNIQUE (location_id, auditorium_no)
);

CREATE TABLE auditorium_specs (
  id SERIAL PRIMARY KEY,
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  projector TEXT,
  screen TEXT,
  sound TEXT,
  supported_ar TEXT,
  masking TEXT CHECK (masking IN ('side','top','both','none','unknown')),
  notes TEXT,
  renewal_event TEXT,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  confidence DOUBLE PRECISION NOT NULL
);
CREATE INDEX ix_aud_specs ON auditorium_specs (auditorium_id, valid_from DESC);

CREATE TABLE showtimes (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  starts_at TEXT NOT NULL,
  ends_at_est TEXT NOT NULL,
  format TEXT NOT NULL,
  is_3d INTEGER NOT NULL DEFAULT 0,
  language TEXT DEFAULT 'sub',
  price_adult INTEGER,
  booking_url TEXT,
  entry_method TEXT NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual','partner','parser')),
  data_checked_at TEXT NOT NULL,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL DEFAULT 'estimated',
  status TEXT NOT NULL DEFAULT 'active',
  is_synthetic INTEGER NOT NULL DEFAULT 1,
  admin_note TEXT,
  verified_at TEXT,
  format_mismatch_note TEXT
);
CREATE INDEX ix_showtimes_movie ON showtimes (movie_id, starts_at);
CREATE INDEX ix_showtimes_aud ON showtimes (auditorium_id, starts_at);

CREATE TABLE showtime_changes (
  id SERIAL PRIMARY KEY,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','disable','enable','duplicate')),
  changes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_showtime_changes ON showtime_changes (showtime_id, created_at DESC);

CREATE TABLE movie_format_versions (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  raw_value TEXT NOT NULL,
  normalized_value TEXT,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  info_status TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  verified_at TEXT,
  UNIQUE (movie_id, source_name, raw_value)
);

CREATE TABLE external_observations (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  entity_hint TEXT,
  fetched_at TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  normalized TEXT NOT NULL,
  raw_excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','promoted','unchanged','error')),
  promoted_at TEXT,
  error TEXT,
  diff TEXT,
  created_at TEXT
);
CREATE INDEX ix_extobs ON external_observations (provider, external_id, fetched_at DESC);

CREATE TABLE seat_zones (
  id SERIAL PRIMARY KEY,
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  purpose TEXT NOT NULL,
  row_range TEXT,
  col_range TEXT,
  rationale TEXT,
  source_id INTEGER REFERENCES sources(id),
  info_status TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 1)
);
CREATE INDEX ix_seat_zones ON seat_zones (auditorium_id);

CREATE TABLE observations (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  observed_at TEXT NOT NULL,
  info_status TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  superseded_by INTEGER REFERENCES observations(id)
);
CREATE INDEX ix_obs ON observations (entity_type, entity_id, field, observed_at DESC);

CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  explicit TEXT,
  sensitivity TEXT,
  accessibility TEXT,
  updated_at TEXT
);

CREATE TABLE recommendation_runs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  request TEXT NOT NULL,
  weights TEXT NOT NULL,
  results TEXT,
  latency_ms INTEGER,
  created_at TEXT
);

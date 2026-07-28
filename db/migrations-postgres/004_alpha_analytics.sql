-- 알파 테스트 인프라 (PostgreSQL) — db/migrations/004_alpha_analytics.sql과 동일 구조

CREATE TABLE analytics_sessions (
  id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  app_version TEXT
);

CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  event_name TEXT NOT NULL,
  properties TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_analytics_events_session ON analytics_events (session_id, created_at DESC);
CREATE INDEX ix_analytics_events_name ON analytics_events (event_name, created_at DESC);

ALTER TABLE recommendation_runs ADD COLUMN policy_version TEXT;
ALTER TABLE recommendation_runs ADD COLUMN code_version TEXT;
ALTER TABLE recommendation_runs ADD COLUMN session_id TEXT REFERENCES analytics_sessions(id);
ALTER TABLE recommendation_runs ADD COLUMN excluded TEXT;

CREATE TABLE recommendation_feedback (
  id SERIAL PRIMARY KEY,
  recommendation_run_id INTEGER NOT NULL REFERENCES recommendation_runs(id),
  showtime_id INTEGER,
  helpfulness TEXT NOT NULL CHECK (helpfulness IN ('very_helpful','somewhat_helpful','neutral','not_very_helpful','not_helpful')),
  reasons TEXT,
  free_text TEXT,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  created_at TEXT NOT NULL
);
CREATE INDEX ix_reco_feedback_run ON recommendation_feedback (recommendation_run_id);

CREATE TABLE recommendation_selections (
  id SERIAL PRIMARY KEY,
  recommendation_run_id INTEGER NOT NULL REFERENCES recommendation_runs(id),
  selection_type TEXT NOT NULL CHECK (selection_type IN ('picked_recommended','picked_other_candidate','picked_outside','undecided','cancelled')),
  auditorium_id INTEGER REFERENCES auditoriums(id),
  reasons TEXT,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  created_at TEXT NOT NULL
);
CREATE INDEX ix_reco_selection_run ON recommendation_selections (recommendation_run_id);

CREATE TABLE post_watch_surveys (
  id SERIAL PRIMARY KEY,
  recommendation_run_id INTEGER NOT NULL REFERENCES recommendation_runs(id),
  overall_satisfaction INTEGER NOT NULL CHECK (overall_satisfaction BETWEEN 1 AND 5),
  info_accuracy INTEGER CHECK (info_accuracy BETWEEN 1 AND 5),
  seat_satisfaction INTEGER CHECK (seat_satisfaction BETWEEN 1 AND 5),
  screen_satisfaction INTEGER CHECK (screen_satisfaction BETWEEN 1 AND 5),
  sound_satisfaction INTEGER CHECK (sound_satisfaction BETWEEN 1 AND 5),
  travel_time_accuracy INTEGER CHECK (travel_time_accuracy BETWEEN 1 AND 5),
  price_accuracy INTEGER CHECK (price_accuracy BETWEEN 1 AND 5),
  would_choose_again INTEGER CHECK (would_choose_again BETWEEN 1 AND 5),
  would_reuse_cinefit INTEGER CHECK (would_reuse_cinefit BETWEEN 1 AND 5),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  created_at TEXT NOT NULL
);
CREATE INDEX ix_postwatch_run ON post_watch_surveys (recommendation_run_id);

CREATE TABLE alpha_surveys (
  id SERIAL PRIMARY KEY,
  hardest_part TEXT,
  most_helpful_info TEXT,
  unnecessary_info TEXT,
  wanted_info TEXT,
  trusted_result INTEGER CHECK (trusted_result BETWEEN 1 AND 5),
  reuse_intent INTEGER CHECK (reuse_intent BETWEEN 1 AND 5),
  special_screen_experience TEXT CHECK (special_screen_experience IN ('none','occasional','frequent','expert')),
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id),
  created_at TEXT NOT NULL
);

CREATE TABLE booking_link_checks (
  id SERIAL PRIMARY KEY,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
  status TEXT NOT NULL CHECK (status IN ('valid','redirected','expired','not_found','blocked','unknown')),
  http_status INTEGER,
  note TEXT,
  checked_at TEXT NOT NULL
);
CREATE INDEX ix_booking_checks_showtime ON booking_link_checks (showtime_id, checked_at DESC);

CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE auditorium_aliases (
  id SERIAL PRIMARY KEY,
  auditorium_id INTEGER NOT NULL REFERENCES auditoriums(id),
  alias TEXT NOT NULL
);
CREATE INDEX ix_aud_alias ON auditorium_aliases (alias);

CREATE TABLE movie_aliases (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  alias TEXT NOT NULL
);
CREATE INDEX ix_movie_alias ON movie_aliases (alias);

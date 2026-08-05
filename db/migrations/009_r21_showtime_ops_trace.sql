-- R21: 회차 운영 필드 + 추천 trace 저장.
-- (1) showtimes: 공급원(provider)·확인한 공식 페이지(source_url)·만료 시각(expires_at)·
--     검증 상태(verification_status)를 명시 저장한다. 기존 행은 synthetic 여부로 상태를 보정.
-- (2) recommendation_runs: 재현 가능한 trace JSON(퍼널 전후 카운트·후보별 제외 사유·
--     4축 점수·soft penalty·최종 순위·데이터 상태).
ALTER TABLE showtimes ADD COLUMN provider TEXT;
ALTER TABLE showtimes ADD COLUMN source_url TEXT;
ALTER TABLE showtimes ADD COLUMN expires_at TEXT;
ALTER TABLE showtimes ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'verified';

UPDATE showtimes SET verification_status = CASE WHEN is_synthetic = 1 THEN 'unverified' ELSE 'verified' END;
UPDATE showtimes SET provider = CASE WHEN is_synthetic = 1 THEN 'seed_synthetic' ELSE 'admin_manual' END WHERE provider IS NULL;

-- 동일 회차(같은 상영관·같은 시작 시각) 중복 방지 — 활성 행에만 적용하는 부분 유니크
-- 인덱스. 서비스 계층 검증(adminShowtimeService)의 DB 레벨 안전망.
CREATE UNIQUE INDEX IF NOT EXISTS ux_showtimes_active_slot
  ON showtimes (auditorium_id, starts_at) WHERE status = 'active';

ALTER TABLE recommendation_runs ADD COLUMN trace TEXT;

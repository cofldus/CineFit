// 좌석 존 시드 — 문서 01 조사에서 확인된 커뮤니티 통설을 info_status·confidence와 함께 기록.
// 멱등: 재실행 시 기존 시드 존을 지우고 다시 넣는다. 실행: npm run db:seed 에 포함.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.CINEFIT_DB_PATH ?? join(here, '..', 'spikes', 'minimal-db', 'cinefit-spike.db');
if (!existsSync(dbPath)) {
  console.error(`DB가 없습니다: ${dbPath} — 먼저 seed·migrate를 실행하세요.`);
  process.exit(1);
}
const db = new DatabaseSync(dbPath);

const sourceId = (name) => db.prepare(`SELECT id FROM sources WHERE name = ?`).get(name)?.id ?? null;
const audId = (locName, no) =>
  db
    .prepare(
      `SELECT a.id FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
       WHERE l.name LIKE ? AND a.auditorium_no = ?`,
    )
    .get(`%${locName}%`, no)?.id ?? null;

const SRC_EXT = sourceId('익스트림무비');
const SRC_SEED = sourceId('스파이크 합성 시드');

// [locName, no, purposes, rowRange, colRange, rationale, source, status, observedAt, confidence]
const zones = [
  ['용산아이파크몰', 'IMAX관', ['immersive', 'sound'], 'J~L열', '중앙 블록', '용아맥 통설 명당 — 시야 가득 + 사운드 균형 (커뮤니티 복수 일치)', SRC_EXT, 'user_report', '2026-06-15', 0.7],
  ['용산아이파크몰', 'IMAX관', ['neck_easy', 'subtitle'], 'N열 이후', '중앙', '대형 스크린 후방 — 목 부담·자막 왕복 시선 완화 (추정)', SRC_SEED, 'estimated', '2026-07-27', 0.3],
  ['코엑스', '돌비시네마관', ['sound', 'immersive'], 'H열', '중앙', '코돌비 H열 명당 통설 (문서 01 §4 — 커뮤니티 복수 일치)', SRC_EXT, 'user_report', '2026-06-15', 0.7],
  ['코엑스', '돌비시네마관', ['neck_easy'], 'J열 이후', '중앙', 'D열 이전은 목 아픔 제보 다수 — 후방 권장', SRC_EXT, 'user_report', '2026-06-15', 0.5],
  ['월드타워', '수퍼플렉스G관', ['overview', 'subtitle'], '후방 1/3', '중앙', '초대형 스크린(폭 34m) 전체 시야 확보 (추정)', SRC_SEED, 'estimated', '2026-07-27', 0.3],
  ['왕십리', 'IMAX관', ['immersive'], '중앙열', '중앙 블록', 'IMAX 표준 중앙 권장 (추정 — 관별 제보 미수집)', SRC_SEED, 'estimated', '2026-07-27', 0.3],
  ['여의도', '4DX관', ['low_motion'], '중앙열', '중앙', '모션 강도가 균일한 구역 (추정)', SRC_SEED, 'estimated', '2026-07-27', 0.3],
  ['천호', 'IMAX관', ['immersive'], '중앙열', '중앙 블록', 'IMAX 표준 중앙 권장 (추정 — 리뉴얼 후 제보 미수집)', SRC_SEED, 'estimated', '2026-07-27', 0.3],
];

db.exec('BEGIN');
db.prepare(`DELETE FROM seat_zones`).run(); // 시드 전용 테이블 — 전체 재구성 (제보 유입 전까지)
let inserted = 0;
for (const [loc, no, purposes, rowRange, colRange, rationale, src, status, at, conf] of zones) {
  const id = audId(loc, no);
  if (!id) {
    console.warn(`! 상영관 못 찾음: ${loc} ${no} — 건너뜀`);
    continue;
  }
  db.prepare(
    `INSERT INTO seat_zones (auditorium_id, purpose, row_range, col_range, rationale, source_id, info_status, observed_at, confidence)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(id, JSON.stringify(purposes), rowRange, colRange, rationale, src, status, at, conf);
  inserted++;
}
db.exec('COMMIT');
console.log(`seat_zones: ${inserted}건 시드 완료 (${dbPath})`);
db.close();

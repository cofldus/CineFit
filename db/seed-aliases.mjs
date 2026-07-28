// 검색용 별칭 시드 — 커뮤니티에서 실제 통용되는 상영관 닉네임만 등록한다(문서 01 조사 근거,
// db/seed-seat-zones.mjs가 이미 인용한 것과 동일 출처). 멱등: 재실행 시 지우고 다시 넣는다.
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

const audId = (locName, no) =>
  db
    .prepare(
      `SELECT a.id FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
       WHERE l.name LIKE ? AND a.auditorium_no = ?`,
    )
    .get(`%${locName}%`, no)?.id ?? null;

const movieId = (title) => db.prepare(`SELECT id FROM movies WHERE title = ?`).get(title)?.id ?? null;

// [locName, no, alias] — 실제 커뮤니티 통용 닉네임만(문서 01 §4)
const auditoriumAliases = [
  ['용산아이파크몰', 'IMAX관', '용아맥'],
  ['코엑스', '돌비시네마관', '코돌비'],
  ['왕십리', 'IMAX관', '왕아맥'],
  ['남양주', '돌비시네마관', '남돌비'],
];

// [title, alias]
const movieAliases = [['듄: 파트 2', '듄2']];

db.exec('BEGIN');
try {
  db.exec('DELETE FROM auditorium_aliases');
  db.exec('DELETE FROM movie_aliases');

  const insertAudAlias = db.prepare(`INSERT INTO auditorium_aliases (auditorium_id, alias) VALUES (?, ?)`);
  let audCount = 0;
  for (const [locName, no, alias] of auditoriumAliases) {
    const id = audId(locName, no);
    if (!id) {
      console.warn(`상영관 별칭 시드 건너뜀 — 대상 없음: ${locName} ${no} (${alias})`);
      continue;
    }
    insertAudAlias.run(id, alias);
    audCount += 1;
  }

  const insertMovieAlias = db.prepare(`INSERT INTO movie_aliases (movie_id, alias) VALUES (?, ?)`);
  let movieCount = 0;
  for (const [title, alias] of movieAliases) {
    const id = movieId(title);
    if (!id) {
      console.warn(`영화 별칭 시드 건너뜀 — 대상 없음: ${title} (${alias})`);
      continue;
    }
    insertMovieAlias.run(id, alias);
    movieCount += 1;
  }

  db.exec('COMMIT');
  console.log(`별칭 시드 완료 — 상영관 ${audCount}건, 영화 ${movieCount}건 (${dbPath})`);
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

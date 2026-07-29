// 관리자 검토 화면 데모용 KMDb 연결 후보 시드 — 실제 KMDb 호출 없이, 검토가 필요한 상태를
// 재현하기 위한 예시 후보 2건을 넣는다(둘 다 등급이 같아 자동 연결되지 않는 상황을 흉내냄).
// 멱등: 재실행 시 지우고 다시 넣는다.
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

const movieId = db.prepare(`SELECT id FROM movies WHERE title = ?`).get('존 오브 인터레스트')?.id ?? null;
if (!movieId) {
  console.log('시드 대상 영화를 찾지 못해 건너뜁니다(존 오브 인터레스트).');
  process.exit(0);
}

const now = new Date().toISOString();
const candidates = [
  {
    docid: 'K-DEMO-1',
    title: '존 오브 인터레스트',
    tier: 'needs_review',
    signals: { titleMatch: true, directorMatch: null, yearDiff: null },
  },
  {
    docid: 'K-DEMO-2',
    title: '존 오브 인터레스트 (2023)',
    tier: 'needs_review',
    signals: { titleMatch: true, directorMatch: null, yearDiff: null },
  },
];

db.exec('BEGIN');
try {
  db.prepare(`DELETE FROM movie_identifier_candidates WHERE movie_id = ? AND kmdb_docid LIKE 'K-DEMO-%'`).run(movieId);
  const insert = db.prepare(
    `INSERT INTO movie_identifier_candidates (movie_id, kmdb_docid, kmdb_title, match_tier, match_signals, status, auto_linked, created_at)
     VALUES (?,?,?,?,?,'pending',0,?)`,
  );
  for (const c of candidates) insert.run(movieId, c.docid, c.title, c.tier, JSON.stringify(c.signals), now);
  db.exec('COMMIT');
  console.log(`KMDb 연결 후보 데모 시드 완료 — ${candidates.length}건 (${dbPath})`);
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

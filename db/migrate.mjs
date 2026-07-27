// 선형 마이그레이션 러너 — schema_migrations로 적용 이력 추적, 파일 단위 트랜잭션.
// 실행: npm run db:migrate (db:seed 뒤에 자동 실행됨)
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath =
  process.env.CINEFIT_DB_PATH ?? join(here, '..', 'spikes', 'minimal-db', 'cinefit-spike.db');

if (!existsSync(dbPath)) {
  console.error(`DB가 없습니다: ${dbPath} — 먼저 npm run db:seed 를 실행하세요.`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const applied = new Set(
  db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name),
);
const files = readdirSync(join(here, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`= ${file} (이미 적용됨)`);
    continue;
  }
  const sql = readFileSync(join(here, 'migrations', file), 'utf8');
  db.exec('BEGIN');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    db.exec('COMMIT');
    console.log(`+ ${file} 적용`);
    ran++;
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(`! ${file} 실패: ${e.message}`);
    process.exit(1);
  }
}
console.log(`마이그레이션 완료 — 신규 ${ran}건, 총 ${files.length}건 (${dbPath})`);
db.close();

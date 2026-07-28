// 다방언 마이그레이션 러너 — DATABASE_PROVIDER(sqlite 기본)에 따라
// db/migrations/(SQLite) 또는 db/migrations-postgres/(PostgreSQL)를 적용한다.
// schema_migrations로 이력 추적, 파일 단위 트랜잭션, 멱등.
// 사용: node db/migrate.mjs [--status | --validate]
//  --status   적용/미적용 목록 출력
//  --validate 미적용 마이그레이션이 있으면 종료 코드 1 (앱보다 오래된 스키마 차단)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mode = process.argv.includes('--status') ? 'status' : process.argv.includes('--validate') ? 'validate' : 'migrate';
const provider = (process.env.DATABASE_PROVIDER ?? 'sqlite').toLowerCase();

// 파괴적 변경 사전 차단 — 운영 마이그레이션에 금지 패턴이 있으면 거부
const DESTRUCTIVE = /\b(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE)\b/i;

function loadFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(dir, f), 'utf8') }));
}

async function runner(db) {
  // db: { exec(sql), query(sql)->rows, begin/commit/rollback via exec }
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set((await db.query('SELECT name FROM schema_migrations')).map((r) => r.name));
  const dir = provider === 'postgres' ? join(here, 'migrations-postgres') : join(here, 'migrations');
  const files = loadFiles(dir);
  const pending = files.filter((f) => !applied.has(f.name));

  if (mode === 'status') {
    for (const f of files) console.log(`${applied.has(f.name) ? '=' : '·'} ${f.name} ${applied.has(f.name) ? '(적용됨)' : '(미적용)'}`);
    console.log(`[${provider}] 적용 ${files.length - pending.length} / 미적용 ${pending.length}`);
    return 0;
  }
  if (mode === 'validate') {
    if (pending.length) {
      console.error(`[${provider}] 스키마가 앱 버전보다 오래되었습니다 — 미적용 마이그레이션 ${pending.length}건: ${pending.map((f) => f.name).join(', ')}`);
      console.error('npm run db:migrate 를 실행하세요.');
      return 1;
    }
    console.log(`[${provider}] 스키마 최신 상태 (${files.length}건 적용)`);
    return 0;
  }

  let ran = 0;
  for (const f of files) {
    if (applied.has(f.name)) {
      console.log(`= ${f.name} (이미 적용됨)`);
      continue;
    }
    if (DESTRUCTIVE.test(f.sql)) {
      console.error(`! ${f.name} 거부 — 파괴적 구문(DROP/TRUNCATE) 포함. 별도 절차로 처리하세요.`);
      return 1;
    }
    try {
      await db.exec('BEGIN');
      await db.exec(f.sql);
      await db.run(`INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`, [f.name, new Date().toISOString()]);
      await db.exec('COMMIT');
      console.log(`+ ${f.name} 적용`);
      ran++;
    } catch (e) {
      await db.exec('ROLLBACK').catch(() => {});
      console.error(`! ${f.name} 실패(롤백됨): ${e.message}`);
      return 1;
    }
  }
  console.log(`[${provider}] 마이그레이션 완료 — 신규 ${ran}건, 총 ${files.length}건`);
  return 0;
}

async function main() {
  if (provider === 'postgres') {
    const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_DIRECT_URL 또는 DATABASE_URL 이 필요합니다.');
      console.error('로컬: npm run pg:up 후 DATABASE_URL=postgres://cinefit:cinefit-dev-only@127.0.0.1:55432/cinefit_dev');
      process.exit(1);
    }
    const { default: pg } = await import('pg');
    const client = new pg.Client({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    try {
      await client.connect();
    } catch (e) {
      console.error(`PostgreSQL 연결 실패: ${e.message}`);
      console.error('DB가 떠 있는지 확인하세요: npm run pg:up (상태: npm run pg:status)');
      process.exit(1);
    }
    const db = {
      exec: (sql) => client.query(sql),
      query: async (sql) => (await client.query(sql)).rows,
      run: (sql, params) => client.query(sql.replace(/\?/g, (() => { let n = 0; return () => `$${++n}`; })()), params),
    };
    const code = await runner(db);
    await client.end();
    process.exit(code);
  } else {
    const dbPath = process.env.CINEFIT_DB_PATH ?? join(here, '..', 'spikes', 'minimal-db', 'cinefit-spike.db');
    if (!existsSync(dbPath)) {
      console.error(`SQLite DB가 없습니다: ${dbPath} — 먼저 npm run db:seed 를 실행하세요.`);
      process.exit(1);
    }
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(dbPath);
    const db = {
      exec: async (sql) => raw.exec(sql),
      query: async (sql) => raw.prepare(sql).all(),
      run: async (sql, params) => raw.prepare(sql).run(...params),
    };
    const code = await runner(db);
    raw.close();
    process.exit(code);
  }
}

main();

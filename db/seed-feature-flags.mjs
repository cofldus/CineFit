// 기본 기능 플래그 시드 — 개발/데모 환경에서 온보딩이 기본으로 보이게 한다. 멱등: 재실행 시
// 지우고 다시 넣는다(관리자가 나중에 끄면 npm run db:seed를 다시 돌리지 않는 한 유지된다).
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

const DEFAULT_FLAGS = [
  ['onboarding', 1, '홈 화면 3문항 온보딩 — 추천 폼 기본값 채우기'],
  ['private_alpha_gate', 0, '비공개 알파 게이트(초대 코드+동의 강제) — 실제 알파 시작 전까지 꺼둔다(docs/PRIVATE-ALPHA.md)'],
];

db.exec('BEGIN');
try {
  const insert = db.prepare(
    `INSERT INTO feature_flags (key, enabled, description, updated_at, updated_by) VALUES (?,?,?,?,?)
     ON CONFLICT(key) DO NOTHING`,
  );
  let count = 0;
  const now = new Date().toISOString();
  for (const [key, enabled, description] of DEFAULT_FLAGS) {
    const result = insert.run(key, enabled, description, now, 'seed');
    if (result.changes > 0) count += 1;
  }
  db.exec('COMMIT');
  console.log(`기능 플래그 시드 완료 — 신규 ${count}건 (기존 값은 보존, ${dbPath})`);
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

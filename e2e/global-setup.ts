// E2E 전용 DB를 격리 생성 — 개발용 시드 DB를 오염시키지 않는다.
// webServer(playwright.config.ts)가 같은 CINEFIT_DB_PATH를 사용한다.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const E2E_DB_PATH = join(process.cwd(), 'test-results', 'e2e.db');

export default function globalSetup() {
  mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
  const env = { ...process.env, CINEFIT_DB_PATH: E2E_DB_PATH };
  execSync('node spikes/minimal-db/seed.mjs', { env, stdio: 'inherit' });
  execSync('node db/migrate.mjs', { env, stdio: 'inherit' });
  execSync('node db/seed-seat-zones.mjs', { env, stdio: 'inherit' });
  execSync('node db/seed-aliases.mjs', { env, stdio: 'inherit' });
  execSync('node db/seed-feature-flags.mjs', { env, stdio: 'inherit' });
  execSync('node db/seed-identifier-candidates.mjs', { env, stdio: 'inherit' });
}

import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

// 사전 조건: npm run build (webServer가 프로덕션 서버를 띄움)
// DB는 global-setup이 test-results/e2e.db로 격리 생성한다.
const E2E_DB_PATH = join(process.cwd(), 'test-results', 'e2e.db');

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // 항상 격리 DB·환경으로 새 서버
    timeout: 60_000,
    env: {
      CINEFIT_DB_PATH: E2E_DB_PATH,
      CINEFIT_CLOCK_MODE: 'demo', // now = 2026-07-27T12:00+09:00 — 결정적 E2E
      ADMIN_PASSWORD: 'e2e-admin-pw',
      CINEFIT_INSECURE_COOKIE: 'true', // http://localhost 프로덕션 서버에서 세션 쿠키 허용
    },
  },
});

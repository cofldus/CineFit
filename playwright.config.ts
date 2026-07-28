import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

// 사전 조건: npm run build (webServer가 프로덕션 서버를 띄움)
// DB는 global-setup이 test-results/e2e.db로 격리 생성한다.
const E2E_DB_PATH = join(process.cwd(), 'test-results', 'e2e.db');

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  // 모든 스펙 파일이 하나의 격리 SQLite DB를 공유한다(파일마다 새 DB를 만들지 않음) — 병렬
  // 워커로 돌리면 admin-flow.spec.ts 같은 DB 변경 테스트와 visual.spec.ts의 스크린샷이 실행
  // 순서에 따라 다른 상태를 보게 되어 비결정적으로 실패한다. 워커 1개로 고정해 실행 순서를
  // 결정적으로 만든다(테스트 수가 적어 성능 영향은 미미하다).
  fullyParallel: false,
  workers: 1,
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

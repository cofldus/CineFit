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
  // 시각 회귀는 "시드 직후" 상태에서만 찍는다 — 기능 테스트(추천 실행 기록·회차 등록·제보
  // 승격)가 DB를 변형하므로, visual이 뒤에 돌면 스냅샷이 "그 시점까지 돈 테스트 수"에
  // 의존해 버린다. 실제 사고: visual 스펙만 단독 실행해 베이스라인을 재생성했더니(=시드
  // 상태) 풀 스위트(=변형 상태)를 도는 CI와 관리자 대시보드의 실행 건수·행 수가 어긋나
  // 3장이 계속 빨간불이었다. visual을 선행 프로젝트로 분리하면 단독 실행과 풀 스위트가
  // 항상 같은 상태를 본다.
  projects: [
    { name: 'visual', testMatch: /visual\.spec\.ts/ },
    { name: 'functional', testIgnore: /visual\.spec\.ts/, dependencies: ['visual'] },
  ],
  // 프로젝트 도입 시 기본 템플릿은 파일명에 -visual(프로젝트명)을 붙인다 — 기존 베이스라인
  // 파일명(…-linux.png)을 유지하기 위해 프로젝트명 토큰을 뺀 템플릿으로 고정.
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{platform}{ext}',
  // R21.1 §6: 실패 시 원인 특정을 위한 재료 보존 — trace/screenshot/video는 실패한
  // 테스트에서만 남긴다. 전체 잡에 무조건적 retry는 넣지 않는다(retries 기본 0 유지 —
  // 플레이크를 가리는 대신 아티팩트로 원인을 특정한다).
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
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

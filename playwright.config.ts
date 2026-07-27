import { defineConfig } from '@playwright/test';

// 사전 조건: npm run db:seed && npm run build (webServer가 프로덕션 서버를 띄움)
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

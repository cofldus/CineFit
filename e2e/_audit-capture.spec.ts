// Phase 10 UI 리디자인용 일회성 스크린샷 캡처 — 정식 회귀 스펙이 아니다, 사용 후 삭제한다.
// OUT_DIR을 바꿔가며 쓴다: before(고정, 덮어쓰지 말 것) / wip(작업 중 미리보기) / after(최종).
import { test } from '@playwright/test';

const OUT_DIR = 'design/audit/wip';

const DESKTOP = { width: 1440, height: 1200 };
const MOBILE = { width: 390, height: 844 };

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'movies', path: '/movies' },
  { name: 'search', path: '/search?q=CGV' },
  { name: 'recommend', path: '/recommend/1' },
  { name: 'results', path: '/results?movieId=1&date=2026-07-28' },
  { name: 'cinema-detail', path: '/cinemas/1' },
  { name: 'sources', path: '/sources' },
  { name: 'report', path: '/cinemas/1/report' },
];

for (const { name, path } of PAGES) {
  test(`capture ${name} desktop`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT_DIR}/desktop/${name}.png`, fullPage: true });
  });

  test(`capture ${name} mobile`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT_DIR}/mobile/${name}.png`, fullPage: true });
  });
}

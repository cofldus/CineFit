// 홈 재구축(phase10/home-visual-reset)용 일회성 스크린샷 캡처 — 정식 회귀 스펙이 아니다.
// OUT_DIR을 바꿔가며 쓴다: before / iteration-1 / iteration-2 / final.
import { test } from '@playwright/test';

const OUT_DIR = process.env.CAPTURE_OUT_DIR ?? 'design/home-redesign/before';

const SIZES = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 1200 },
];

for (const size of SIZES) {
  test(`capture home ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${OUT_DIR}/home-${size.name}.png`, fullPage: true });
  });
}

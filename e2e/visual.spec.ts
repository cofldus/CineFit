// 시각 회귀 — 핵심 화면 스크린샷. demo clock(2026-07-27T12:00+09:00) + e2e 격리 DB로 결정적이다.
// 베이스라인은 CI(ubuntu-latest)와 동일한 리눅스 환경에서 생성한다(docs/TESTING.md 참고) —
// 로컬 OS에서 생성한 스크린샷은 폰트 렌더링 차이로 CI에서 항상 실패한다.
// 실패 시 baseline을 무조건 갱신하지 않는다 — 의도된 시각적 변경인지 먼저 확인한다(섹션 28).
import { expect, test } from '@playwright/test';

const SCREENSHOT_OPTS = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.02,
};

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

test.describe('시각 회귀', () => {
  test('홈 — 모바일', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('홈 — 데스크톱', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('영화 선택', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/movies');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('movies.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('추천 조건 입력', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/recommend/1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('recommend-form.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('추천 결과', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/results?movieId=1&date=2026-07-28');
    await expect(page.getByTestId('pick-균형')).toBeVisible();
    await expect(page).toHaveScreenshot('results.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('추천 결과 — 데스크톱', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/results?movieId=1&date=2026-07-28');
    await expect(page.getByTestId('pick-균형')).toBeVisible();
    await expect(page).toHaveScreenshot('results-desktop.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('추천 결과 — 빈 상태', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/results?movieId=1&maxTravelMinutes=5');
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page).toHaveScreenshot('results-empty.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('상영관 상세', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/cinemas/1');
    await expect(page.getByRole('heading', { name: '현재 사양' })).toBeVisible();
    await expect(page).toHaveScreenshot('cinema-detail.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('관람 후 평가', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/results?movieId=1&date=2026-07-28');
    await page.getByRole('link', { name: /관람하고 오셨다면/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('post-watch.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('출처·신뢰도 안내', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/sources');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('sources.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('제보 폼', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/cinemas/1/report');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('report-form.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('관리자 제보 큐', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/admin/login');
    await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
    await page.goto('/admin/reports');
    // 알려진 이슈: 리눅스에서 이 스펙 전체를 한 프로세스로 실행하면(운영 CI와 동일 조건)
    // report-flow.spec.ts가 방금 쓴 제보가 이 목록에 반영되지 않고 0건으로 보이는 현상을
    // 재현 확인함(윈도우에서는 재현 안 됨 — node:sqlite 커넥션 관련 플랫폼 차이로 추정,
    // 근본 원인 미확정). reload로도 해결되지 않아 원인 조사가 더 필요하다(docs/TESTING.md
    // "알려진 이슈" 참고). 프로덕션은 PostgreSQL만 허용되어(docs/DATABASE.md) 이 경로의
    // 영향을 받지 않지만, SQLite 셀프호스트 배포에는 영향을 줄 수 있다.
    await page.reload();
    await expect(page.getByRole('heading', { name: '제보 검토' })).toBeVisible();
    await expect(page).toHaveScreenshot('admin-reports.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });

  test('관리자 데이터 품질 대시보드', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/admin/login');
    await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
    await page.goto('/admin/quality');
    await expect(page.getByRole('heading', { name: '데이터 품질 대시보드' })).toBeVisible();
    await expect(page).toHaveScreenshot('admin-quality.png', { fullPage: true, ...SCREENSHOT_OPTS });
  });
});

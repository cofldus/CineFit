import { expect, test } from '@playwright/test';

test('홈 → 영화 선택 → 조건 입력 → 추천 3종 → 상세 확인', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('상영관');

  await page.getByRole('link', { name: '추천 시작하기' }).click();
  await expect(page).toHaveURL(/\/movies/);

  await page.getByRole('link', { name: '이 영화로 추천받기' }).first().click();
  await expect(page).toHaveURL(/\/recommend\/\d+/);

  // 기본값 그대로 제출해도 추천을 받을 수 있어야 한다
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page).toHaveURL(/\/results\?/);

  await expect(page.getByTestId('pick-균형')).toBeVisible();
  await expect(page.getByTestId('pick-품질')).toBeVisible();
  await expect(page.getByTestId('pick-근접·가성비')).toBeVisible();

  // 카드 상세 펼치기 → 점수 분해·근거 출처 확인
  await page.getByTestId('pick-균형').locator('summary').click();
  await expect(page.getByTestId('pick-균형').getByText('이 추천에 사용된 출처')).toBeVisible();
  await expect(page.getByTestId('pick-균형').getByText(/신뢰 보정/)).toBeVisible();
});

test('추천 카드에서 상영관 상세로 이동해 사양·좌석 구역·근거를 확인한다', async ({ page }) => {
  await page.goto('/results?movieId=1&date=2026-07-28');
  await page.getByTestId('pick-균형').locator('a[href^="/cinemas/"]').click();
  await expect(page).toHaveURL(/\/cinemas\/\d+/);
  await expect(page.getByRole('heading', { name: '현재 사양' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '목적별 좌석 구역' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '예정 회차' })).toBeVisible();
  // 사양에 상태 배지·확인일이 붙어 있어야 한다
  await expect(page.getByLabel('현재 사양').getByText(/확인|제보|추정/).first()).toBeVisible();
});

test('모든 후보 제외 시 이유와 완화 제안을 보여준다', async ({ page }) => {
  await page.goto('/results?movieId=1&maxTravelMinutes=5');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toContainText('제외');
  await expect(page.getByTestId('empty-state')).toContainText('다시 시도');
});

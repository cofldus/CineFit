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

test('온보딩에 답하면 추천 폼 기본값이 바뀐다(건너뛰면 바뀌지 않는다)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '세 가지만 알려주시면 기본값을 맞춰드려요' })).toBeVisible();
  // SegmentedControl의 radio는 sr-only라 클릭 가능 영역이 거의 없다 — 실제로 보이고 눌리는
  // 라벨(텍스트)을 클릭해야 한다.
  await page.getByText('영상·음향 품질', { exact: true }).click();
  await page.getByText('많이 힘들어요', { exact: true }).click();
  await page.getByLabel('자막이 잘 보이는 좌석을 선호해요').check();
  await page.getByRole('button', { name: '저장하고 시작' }).click();
  await expect(page.getByRole('heading', { name: '세 가지만 알려주시면 기본값을 맞춰드려요' })).not.toBeVisible();

  await page.locator('a[href^="/recommend/"]').first().click();
  await expect(page).toHaveURL(/\/recommend\/\d+/);
  await expect(page.getByRole('radio', { name: '영상·음향 품질' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '많이 힘들어요' })).toBeChecked();
  await expect(page.getByLabel('자막이 잘 보이는 좌석 우선')).toBeChecked();
});

test('별칭으로 영화·상영관을 검색해 각각의 상세로 이동한다', async ({ page }) => {
  await page.goto('/search');
  await page.getByLabel(/영화 제목/).fill('듄2');
  await page.getByRole('button', { name: '검색' }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole('heading', { name: '영화' })).toBeVisible();
  await expect(page.getByRole('link', { name: /듄: 파트 2/ })).toBeVisible();
  await page.getByRole('link', { name: /듄: 파트 2/ }).click();
  await expect(page).toHaveURL(/\/recommend\/\d+/);

  await page.goto('/search?q=용아맥');
  await expect(page.getByRole('heading', { name: '상영관' })).toBeVisible();
  await page.getByRole('link', { name: /용산아이파크몰 IMAX관/ }).click();
  await expect(page).toHaveURL(/\/cinemas\/\d+/);
});

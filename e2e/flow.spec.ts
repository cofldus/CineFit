import { expect, test } from '@playwright/test';

test('홈 → 영화 선택 → 조건 입력 → 추천 3종 → 상세 확인', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('어디서 봐야 할까요');

  await page.getByRole('link', { name: '어디서 볼지 찾아보기' }).first().click();
  await expect(page).toHaveURL(/\/movies/);

  await page.getByRole('link', { name: '이 영화로 추천받기' }).first().click();
  await expect(page).toHaveURL(/\/recommend\/\d+/);

  // 기본값 그대로 제출해도 추천을 받을 수 있어야 한다
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page).toHaveURL(/\/results\?/);

  await expect(page.getByTestId('pick-균형')).toBeVisible();
  await expect(page.getByTestId('pick-품질')).toBeVisible();
  await expect(page.getByTestId('pick-근접·가성비')).toBeVisible();

  // 카드 상세 펼치기 → 점수 분해·근거 출처 확인. 카드 안에 summary가 두 개다(점수 상세 +
  // 피드백 위젯) — 항상 "점수"라는 단어를 포함하는 쪽으로 특정한다.
  await page.getByTestId('pick-균형').locator('summary').filter({ hasText: '점수' }).click();
  await expect(page.getByTestId('pick-균형').getByText('이 추천에 사용된 출처')).toBeVisible();
  await expect(page.getByTestId('pick-균형').getByText(/신뢰 보정/)).toBeVisible();
});

test('추천 카드에서 상영관 상세로 이동해 사양·좌석 구역·근거를 확인한다', async ({ page }) => {
  await page.goto('/results?movieId=1&date=2026-07-28');
  await page.getByTestId('pick-균형').locator('a[href^="/cinemas/"]').click();
  await expect(page).toHaveURL(/\/cinemas\/\d+/);
  await expect(page.getByRole('heading', { name: '목적별 좌석 구역' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '예정 회차' })).toBeVisible();
  // 상세 사양은 결정에 필요한 정보(좌석 구역·회차) 뒤로 밀려 접이식 섹션 안에 있다 —
  // 펼쳐야 상태 배지·확인일이 보인다.
  await expect(page.getByText('상영관 사양')).toBeVisible();
  await page.getByText('상영관 사양').click();
  await expect(page.getByText(/확인|제보|추정/).first()).toBeVisible();
});

test('모든 후보 제외 시 이유와 완화 제안을 보여준다', async ({ page }) => {
  await page.goto('/results?movieId=1&maxTravelMinutes=5');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toContainText('제외');
  await expect(page.getByTestId('empty-state')).toContainText('다시 시도');
});

// 홈 재구축("The Screening Room" 콘셉트)으로 온보딩 3문항 폼을 홈 본문에서 제거했다 —
// localStorage 읽기/쓰기 유틸과 recommend 폼의 기본값 연동 로직 자체는 그대로 남아있지만,
// 지금은 그 폼을 채울 진입점이 어디에도 없다. 온보딩을 recommend 플로우 초기 단계 등으로
// 옮기는 후속 작업에서 이 테스트를 되살린다.
test.skip('온보딩에 답하면 추천 폼 기본값이 바뀐다(건너뛰면 바뀌지 않는다)', async ({ page }) => {
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

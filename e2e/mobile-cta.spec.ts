// R20 §2 — 모바일(390px)에서 sticky CTA 바가 어떤 입력·후보 안내도 가리지 않는다.
// 회귀 방식: 페이지 맨 아래까지 스크롤한 상태에서 마지막 콘텐츠(후보 안내·마지막 입력
// 카드)의 하단이 CTA 바의 상단보다 위에 있어야 한다.
import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function expectNotCoveredByBar(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const bar = page.getByTestId('mobile-cta-bar');
  const targetBox = await target.boundingBox();
  const barBox = await bar.boundingBox();
  expect(targetBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  // 스크롤을 끝까지 내렸을 때 대상의 하단이 바 상단 위에 있어야 한다(1px 허용).
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(barBox!.y + 1);
}

test('390px — 1단계의 마지막 입력 카드와 후보 안내가 CTA에 가려지지 않는다', async ({ page }) => {
  await page.goto('/recommend/1');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // 마지막 입력(편도 이동 한도 라디오 그룹)과 후보 안내가 모두 보이고 바에 가려지지 않는다.
  await expectNotCoveredByBar(page, page.getByRole('radiogroup', { name: '편도 이동 한도' }));
  await expectNotCoveredByBar(page, page.getByTestId('candidate-status'));
});

test('390px — 2·3단계에서도 마지막 콘텐츠가 CTA에 가려지지 않는다', async ({ page }) => {
  await page.goto('/recommend/1');
  await page.getByRole('button', { name: /우선순위 정하기/ }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectNotCoveredByBar(page, page.getByTestId('candidate-status'));

  await page.getByRole('button', { name: /피하고 싶은 조건/ }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // 3단계 마지막 토글("해당 없음")도 가려지지 않는다.
  await expectNotCoveredByBar(page, page.getByText('해당 없음', { exact: true }));
  await expectNotCoveredByBar(page, page.getByTestId('candidate-status'));
});

test('390px — CTA 바 자체는 72~80px 높이 규격을 지킨다', async ({ page }) => {
  await page.goto('/recommend/1');
  const bar = page.getByTestId('mobile-cta-bar');
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(72);
  expect(box!.height).toBeLessThanOrEqual(80);
});

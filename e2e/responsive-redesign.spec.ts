// 개편 대상 3화면(홈·추천 결과·상영관 상세)의 반응형 점검 — 요청된 5개 뷰포트에서
// 가로 스크롤 발생 여부와 핵심 요소 노출을 직접 확인한다. 시각 회귀(visual.spec.ts)는
// 픽셀 diff로 "달라졌는지"만 보므로, 여기서는 "레이아웃이 깨지지 않았는지"를 기능적으로
// 검증한다(문서 09 반응형 체크리스트).
import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1600x1000', width: 1600, height: 1000 },
] as const;

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, '가로 스크롤 발생(문서 폭이 뷰포트보다 넓음)').toBeLessThanOrEqual(1);
}

test.describe('반응형 뷰포트 점검 — 홈/결과/상영관 상세', () => {
  for (const vp of VIEWPORTS) {
    test(`홈 — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name: '어디서 볼지 찾아보기' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: '지금 볼 수 있는 영화' })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test(`추천 결과 — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/results?movieId=1&date=2026-07-28');
      await expect(page.getByTestId('pick-균형')).toBeVisible();
      await expect(page.getByRole('heading', { name: '한눈에 비교' })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });

    test(`상영관 상세 — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/cinemas/1');
      await expect(page.getByRole('heading', { name: '목적별 좌석 구역' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '예정 회차' })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test('모바일에서 하단 내비가 본문 마지막 내용을 가리지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/cinemas/1');
    const nav = page.getByRole('navigation', { name: '하단 메뉴' });
    await expect(nav).toBeVisible();
    const navBox = await nav.boundingBox();
    const sourcesLink = page.getByRole('link', { name: '정보 출처·신뢰도 기준 →' });
    await sourcesLink.scrollIntoViewIfNeeded();
    const linkBox = await sourcesLink.boundingBox();
    expect(navBox && linkBox && linkBox.y + linkBox.height <= navBox.y + 1).toBe(true);
  });
});

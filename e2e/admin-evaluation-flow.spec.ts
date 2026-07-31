import { expect, test } from '@playwright/test';

// 관리자 평가 흐름: 사용자가 실제로 남긴 추천 피드백이 관리자 데이터 품질 대시보드의
// 실패 원인 분류 집계에 그대로 반영되는지 끝까지 확인한다(사용자 화면 → DB → 관리자 화면).
test('사용자 피드백 제출이 관리자 데이터 품질 대시보드의 실패 원인 집계에 반영된다', async ({ page }) => {
  await page.goto('/results?movieId=1&date=2026-07-28');
  await expect(page.getByTestId('pick-균형')).toBeVisible();

  // 피드백은 "이 추천이 도움이 됐나요?" 버튼 2개가 먼저 보이고, 누르면 하단 시트가 열려
  // 5단계 세부 조정과 이유 선택을 받는다 — 아쉬워요를 누르면 '별로 도움 안 됨'이 미리
  // 선택된 상태로 시트가 열린다.
  await page.getByRole('button', { name: '아쉬워요' }).click();
  await page.getByRole('button', { name: '별로 도움 안 됨' }).click();
  await page.getByText('실제 상영 회차가 없음', { exact: true }).click();
  await page.getByRole('button', { name: '피드백 보내기' }).click();
  await expect(page.getByRole('status')).toContainText('피드백 감사합니다');

  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  await page.goto('/admin/quality');
  await expect(page.getByRole('heading', { name: '데이터 품질 대시보드' })).toBeVisible();
  await expect(page.getByText('회차 정보 없음')).toBeVisible();
  await expect(page.getByText('데이터 없음')).toBeVisible();
});

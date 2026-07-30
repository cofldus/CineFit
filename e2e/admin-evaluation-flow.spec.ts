import { expect, test } from '@playwright/test';

// 관리자 평가 흐름: 사용자가 실제로 남긴 추천 피드백이 관리자 데이터 품질 대시보드의
// 실패 원인 분류 집계에 그대로 반영되는지 끝까지 확인한다(사용자 화면 → DB → 관리자 화면).
test('사용자 피드백 제출이 관리자 데이터 품질 대시보드의 실패 원인 집계에 반영된다', async ({ page }) => {
  await page.goto('/results?movieId=1&date=2026-07-28');
  const balancePick = page.getByTestId('pick-균형');
  await expect(balancePick).toBeVisible();

  // 결과 페이지 정보 밀도 축소(phase: Screening Room 정리)로 피드백 버튼이 기본으로
  // 접혀 있다("이 추천, 어땠나요?" summary) — 펼친 뒤에 눌러야 한다.
  await balancePick.getByText('이 추천, 어땠나요?').click();
  await balancePick.getByRole('button', { name: '별로 도움 안 됨' }).click();
  await balancePick.getByText('실제 상영 회차가 없음', { exact: true }).click();
  await balancePick.getByRole('button', { name: '피드백 보내기' }).click();
  await expect(balancePick.getByRole('status')).toContainText('피드백 감사합니다');

  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  await page.goto('/admin/quality');
  await expect(page.getByRole('heading', { name: '데이터 품질 대시보드' })).toBeVisible();
  await expect(page.getByText('회차 정보 없음')).toBeVisible();
  await expect(page.getByText('데이터 없음')).toBeVisible();
});

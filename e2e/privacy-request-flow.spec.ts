// 개인정보 삭제 요청 E2E — 이용자 자기 세션 삭제 요청 → 관리자 검토·실행까지
// 한 흐름으로 검증한다. 세션 쿠키는 첫 페이지 방문 시 AppOpenedTracker가 보내는
// /api/analytics/events 응답으로 발급되므로, 폼 제출 전에 그 요청이 끝나길 기다린다.
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('이용자 세션 삭제 요청 → 관리자가 검토 후 실행하면 완료 처리된다', async ({ page }) => {
  const analyticsResponse = page.waitForResponse((res) => res.url().includes('/api/analytics/events'));
  await page.goto('/movies');
  await analyticsResponse;

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: '개인정보 삭제 요청' })).toBeVisible();

  const sessionForm = page.getByRole('form', { name: '내 이용 데이터 삭제 요청' });
  await sessionForm.getByLabel('남기고 싶은 말 (선택)').fill('E2E 테스트 삭제 요청');
  await sessionForm.getByRole('button', { name: '삭제 요청 보내기' }).click();
  await expect(page.getByText('요청이 접수됐어요')).toBeVisible();

  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  await page.goto('/admin/privacy-requests');
  await expect(page.getByRole('heading', { name: '개인정보 삭제 요청' })).toBeVisible();
  await expect(page.getByText('E2E 테스트 삭제 요청')).toBeVisible();

  await page.getByRole('link', { name: '상세' }).first().click();
  await expect(page.getByRole('heading', { name: /삭제 요청 #/ })).toBeVisible();
  await expect(page.getByText('분석 이벤트:')).toBeVisible();

  await page.getByRole('button', { name: '삭제 실행' }).click();
  await expect(page.getByText('이미 처리된 요청입니다 — 상태: completed')).toBeVisible();
});

test('제보에 남긴 이메일 삭제 요청 → 관리자가 반려할 수 있다', async ({ page }) => {
  await page.goto('/privacy');
  const emailForm = page.getByRole('form', { name: '제보에 남긴 이메일 삭제 요청' });
  await emailForm.getByLabel('제보에 남긴 이메일').fill('e2e-privacy-test@example.com');
  await emailForm.getByRole('button', { name: '삭제 요청 보내기' }).click();
  await expect(page.getByText('요청이 접수됐어요')).toBeVisible();

  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  await page.goto('/admin/privacy-requests?status=pending');
  await expect(page.getByText('e2e-privacy-test@example.com')).toBeVisible();
  await page.getByRole('link', { name: '상세' }).first().click();

  await page.getByLabel('반려 사유(선택 — 반려 시에만 기록)').fill('일치하는 제보 없음');
  await page.getByRole('button', { name: '반려' }).click();
  await expect(page.getByText('이미 처리된 요청입니다 — 상태: rejected')).toBeVisible();
});

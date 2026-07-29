import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
});

test('KMDb 연결 검토: 목록 → 상세 → 후보 승인 → 목록에서 사라짐', async ({ page }) => {
  await page.goto('/admin/data-linkage');
  await expect(page.getByRole('heading', { name: 'KOBIS↔KMDb 식별자 연결 검토' })).toBeVisible();

  const row = page.getByRole('row', { name: /존 오브 인터레스트/ });
  await expect(row).toBeVisible();
  await row.getByRole('link', { name: '검토' }).click();

  await expect(page.getByRole('heading', { name: '존 오브 인터레스트' })).toBeVisible();
  await expect(page.getByText('K-DEMO-1')).toBeVisible();
  await expect(page.getByText('K-DEMO-2')).toBeVisible();

  const targetRow = page.getByRole('row', { name: /K-DEMO-1/ });
  await targetRow.getByRole('button', { name: '이 후보로 연결' }).click();
  await expect(targetRow.getByRole('button', { name: '이 후보로 연결' })).toBeDisabled();

  await page.goto('/admin/data-linkage');
  await expect(page.getByRole('row', { name: /존 오브 인터레스트/ })).toHaveCount(0);
});

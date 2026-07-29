import { expect, test, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  // 이미 관리자로 로그인된 상태면 /admin/login이 서버에서 바로 /admin으로 리다이렉트해
  // 비밀번호 입력 폼 자체가 렌더링되지 않는다 — afterEach가 테스트 본문과 같은 컨텍스트를
  // 공유하므로(로그인 쿠키가 이미 남아있음) 이 경우를 건너뛰지 않으면 fill()이 영원히 대기한다.
  if (new URL(page.url()).pathname === '/admin/login') {
    await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
    await page.getByRole('button', { name: '로그인' }).click();
  }
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
}

async function togglePrivateAlphaGate(page: Page) {
  await page.goto('/admin/feature-flags');
  const row = page.getByRole('row', { name: /private_alpha_gate/ });
  await row.getByRole('button', { name: /켜기|끄기/ }).click();
}

test.describe('비공개 알파 게이트', () => {
  // 다른 스펙 파일과 같은 DB를 공유하므로(§3, workers:1) 테스트가 끝나면 반드시 게이트를
  // 꺼둔다 — 안 그러면 이후 실행되는 모든 공개 페이지 테스트가 초대 페이지로 리다이렉트돼
  // 전부 깨진다.
  test.afterEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/feature-flags');
    const row = page.getByRole('row', { name: /private_alpha_gate/ });
    if (await row.getByRole('button', { name: '끄기' }).isVisible().catch(() => false)) {
      await row.getByRole('button', { name: '끄기' }).click();
    }
  });

  test('게이트가 켜져 있으면 초대 코드 → 동의 후에만 원래 페이지를 볼 수 있다', async ({ page }) => {
    await loginAsAdmin(page);
    await togglePrivateAlphaGate(page);
    await expect(page.getByRole('row', { name: /private_alpha_gate/ }).getByRole('button', { name: '끄기' })).toBeVisible();

    await page.goto('/admin/invite-codes');
    await page.locator('input[name="code"]').fill('E2ETEST');
    await page.getByRole('button', { name: '생성' }).click();
    await expect(page.getByText('E2ETEST')).toBeVisible();

    // 관리자 세션 쿠키와는 별개로, 공개 페이지는 아직 초대되지 않은 상태다
    await page.goto('/movies');
    await expect(page).toHaveURL(/\/alpha\/invite\?next=/);

    // form 자체에도 aria-label="초대 코드 입력"이 있어 getByLabel('초대 코드')가 form과 input
    // 둘 다에 매칭된다(부분 일치) — exact:true로 input의 정확한 라벨("초대 코드")만 잡는다.
    await page.getByLabel('초대 코드', { exact: true }).fill('E2ETEST');
    await page.getByRole('button', { name: '입장하기' }).click();
    await expect(page).toHaveURL(/\/alpha\/consent/);
    await expect(page.getByRole('heading', { name: '알파 참여 전에 알아두세요' })).toBeVisible();

    await page.getByRole('button', { name: '동의하고 시작하기' }).click();
    await expect(page).toHaveURL(/\/movies/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('게이트가 꺼져 있으면(기본값) 공개 페이지가 그대로 열린다', async ({ page }) => {
    await page.goto('/movies');
    await expect(page).toHaveURL(/\/movies/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

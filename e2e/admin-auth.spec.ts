// R21.1 §5 — 비인가 접근: 모든 /admin 페이지는 로그인으로 리다이렉트, /api/admin/*는
// 401을 반환해야 한다(메뉴 숨김이 아니라 서버측 검사). 오류 응답에 스택 트레이스·DB
// 내부 정보가 노출되지 않는 것도 함께 확인한다.
import { expect, test } from '@playwright/test';

const ADMIN_PAGES = [
  '/admin',
  '/admin/showtimes',
  '/admin/showtimes/new',
  '/admin/showtimes/import',
  '/admin/runs',
  '/admin/runs/1',
  '/admin/reports',
  '/admin/quality',
  '/admin/alpha-ops',
  '/admin/invite-codes',
  '/admin/privacy-requests',
];

test('비인가 상태에서 모든 관리자 페이지는 로그인으로 리다이렉트된다', async ({ page }) => {
  for (const path of ADMIN_PAGES) {
    await page.goto(path);
    await expect(page, `${path} → 로그인 리다이렉트`).toHaveURL(/\/admin\/login/);
  }
});

test('비인가 상태에서 관리자 API는 401을 반환하고 내부 정보를 노출하지 않는다', async ({ request }) => {
  const cases: { method: 'get' | 'post' | 'patch'; url: string; data?: unknown }[] = [
    { method: 'get', url: '/api/admin/showtimes' },
    { method: 'post', url: '/api/admin/showtimes', data: { movieId: 1 } },
    { method: 'patch', url: '/api/admin/showtimes/1', data: { status: 'disabled' } },
    { method: 'post', url: '/api/admin/showtimes/import', data: { csv: 'a,b', commit: true } },
    { method: 'get', url: '/api/admin/reports' },
    { method: 'post', url: '/api/admin/feature-flags', data: {} },
    { method: 'post', url: '/api/admin/invite-codes', data: {} },
  ];
  for (const c of cases) {
    const res = await request[c.method](c.url, c.data ? { data: c.data } : undefined);
    expect(res.status(), `${c.method.toUpperCase()} ${c.url}`).toBe(401);
    const body = await res.text();
    // 스택 트레이스·SQL·연결 문자열 노출 금지.
    expect(body).not.toMatch(/at .*\.(ts|js):\d+|SELECT |INSERT |postgres:\/\/|DATABASE_URL/i);
  }
});

test('잘못된 토큰(위조 쿠키)으로도 관리자 API에 접근할 수 없다', async ({ request }) => {
  const res = await request.get('/api/admin/showtimes', {
    headers: { 'x-admin-token': 'forged-token-value' },
  });
  expect(res.status()).toBe(401);
});

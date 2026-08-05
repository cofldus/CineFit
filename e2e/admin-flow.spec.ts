import { expect, test } from '@playwright/test';

test('관리자 로그인 → 실제형 회차 등록 → 사용자 추천에 반영 → 예매 딥링크 표시', async ({ page }) => {
  // 1. 관리자 로그인 (미인증 접근은 로그인으로 리다이렉트)
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  // 2. 실제형 회차 등록 (합성 아님, 공식 예매 딥링크 포함)
  await page.goto('/admin/showtimes/new');
  await page.getByLabel('영화').selectOption({ index: 1 });
  // 등록한 영화 제목을 기억해 뒤의 사용자 흐름에서 같은 영화로 진입한다 — /movies 목록은
  // 기본 정렬(상영 정보 충분한 순, R15)이 있어 "첫 번째 링크"가 이 영화라는 보장이 없다.
  const movieTitle = (await page.getByLabel('영화').locator('option:checked').innerText()).trim();
  await page.getByLabel('극장·상영관').selectOption({ label: 'CGV 용산아이파크몰 IMAX관 [imax]' });
  await page.getByLabel('상영 날짜').fill('2026-08-02');
  await page.getByLabel('시작 시각').fill('19:00');
  await page.getByLabel('상영 포맷').selectOption('imax');
  await page.getByLabel('성인 1인 가격 (원)').fill('28000');
  await page.getByLabel('공식 예매 URL').fill('https://ticket.cgv.co.kr/e2e-demo');
  // R21.1: 실회차는 확인한 공식 페이지 URL(sourceUrl)이 필수다(공식 도메인 allowlist).
  await page.getByLabel(/확인한 공식 페이지 URL/).fill('https://ticket.cgv.co.kr/e2e-demo');
  await page.getByLabel('정보 출처 (어디서 확인했나)').fill('CGV 공식 예매 페이지에서 확인 (E2E)');
  await page.getByRole('button', { name: '회차 등록' }).click();

  // 3. R18: 등록 후 폼에 남아 연속 등록이 가능하다 — 성공 배너 확인 후 목록으로 이동해
  //    관리자 확인 배지 표시를 검증한다.
  await expect(page.getByText(/회차 1건 등록 완료/)).toBeVisible();
  await page.getByRole('link', { name: '회차 목록 보기' }).click();
  await expect(page).toHaveURL(/\/admin\/showtimes$/);
  await expect(page.getByText('✔ 관리자 확인').first()).toBeVisible();

  // 4~6. 사용자 흐름: 영화 선택 → 등록한 날짜로 조건 입력 → 추천 결과에 포함 확인
  await page.goto('/movies');
  await page.locator('a[href^="/recommend/"]').filter({ hasText: movieTitle.split(' (')[0] }).first().click();
  await page.getByLabel('관람 날짜').fill('2026-08-02');
  // 3단계 flow — 날짜는 1단계에 있으므로 채운 뒤 단계별 CTA로 진행(R15 문구).
  await page.getByRole('button', { name: /우선순위 정하기/ }).click();
  await page.getByRole('button', { name: /피하고 싶은 조건/ }).click();
  await page.getByRole('button', { name: /결과 확인하기/ }).click();
  await expect(page).toHaveURL(/\/results\?/);

  // 관리자 확인 회차 기준 배너 — 결과 페이지 위계 개편으로 카드마다 반복하던 회차 상태
  // 배지는 없앴다(페이지 상단 배너 하나로 통합, 같은 결과 페이지의 모든 카드는 항상
  // 배너와 동일한 합성/실제 여부를 공유하므로 배지 반복이 불필요한 중복이었다).
  await expect(page.getByText('관리자가 공식 예매 페이지에서 확인한 회차 기준')).toBeVisible();
  await expect(page.getByTestId('pick-균형')).toBeVisible();

  // 7. 공식 예매 딥링크 표시
  const booking = page.getByTestId('pick-균형').getByRole('link', { name: /공식 예매 페이지로 이동/ });
  await expect(booking).toBeVisible();
  await expect(booking).toHaveAttribute('href', 'https://ticket.cgv.co.kr/e2e-demo');
});

test('합성 회차만 있는 날짜는 회차 데이터 연결 전(테스트 후보 기준)임을 명시한다', async ({ page }) => {
  await page.goto('/results?movieId=1&date=2026-07-28');
  // R20 §9 unavailable: 정확한 실데이터처럼 보이지 않게 상태를 명시하고 공식 경로를 안내한다.
  await expect(page.getByText(/회차 데이터 연결 전/)).toBeVisible();
  await expect(page.getByRole('link', { name: /CGV 공식 상영시간표/ })).toBeVisible();
  await expect(page.getByTestId('pick-균형')).toBeVisible();
});

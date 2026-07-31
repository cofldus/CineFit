// 제보 전체 파이프라인 E2E — 사용자 제보 → 관리자 검토·승격 → 추천 결과 변화까지
// 하나의 흐름으로 검증한다(섹션 24). 대상: CGV 용산아이파크몰 13관(auditorium id=2,
// 시드 상 좌석 존이 하나도 없는 상영관 — 승격 전/후 차이를 명확히 관찰할 수 있다).
// 세 테스트는 상태를 공유하므로 순서대로 실행되어야 한다(serial).
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const AUDITORIUM_ID = 2; // CGV 용산아이파크몰 13관 — seed 상 seat_zones 없음
const RESULTS_URL = '/results?movieId=1&date=2026-07-28'; // 기존 flow.spec.ts와 동일 요청 — 13관이 '근접·가성비' 픽으로 포함됨

let reportId: number;

test('사용자 제보 흐름: 상영관 상세 → 제보 → 접수 확인', async ({ page }) => {
  await page.goto(`/cinemas/${AUDITORIUM_ID}`);
  await expect(page.getByRole('heading', { name: '목적별 좌석 구역' })).toBeVisible();
  await expect(page.getByText('아직 이 관의 좌석 구역 제보가 없어요.')).toBeVisible();

  await page.getByRole('link', { name: /정보 수정 제보/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/cinemas/${AUDITORIUM_ID}/report`));

  // 제보 유형은 '좌석 구역' 기본값 그대로 사용
  await page.getByRole('checkbox', { name: '몰입' }).check();
  await page.getByLabel('열 또는 좌석 구역').fill('J~K열 중앙');
  await page.getByLabel('근거 설명').fill('J~K열 중앙에서 화면이 시야 가득 들어와 몰입감이 좋았습니다 (E2E 제보).');

  await page.getByRole('button', { name: '제보 제출' }).click();
  await expect(page.getByRole('heading', { name: /제보가 접수됐어요/ })).toBeVisible();

  reportId = Number(await page.getByTestId('report-id').textContent());
  expect(reportId).toBeGreaterThan(0);
});

test('관리자 검수 흐름: 제보 목록 → 상세 → 좌석 존 승격', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();

  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: '제보 검토' })).toBeVisible();
  await expect(page.getByRole('link', { name: '검토' }).first()).toBeVisible();

  await page.goto(`/admin/reports/${reportId}`);
  await expect(page.getByRole('heading', { name: `제보 #${reportId}` })).toBeVisible();
  await expect(page.getByText('J~K열 중앙에서 화면이')).toBeVisible();

  await page.getByRole('checkbox', { name: '몰입' }).check();
  await page.getByLabel('행 범위').fill('J~K열 중앙');
  await page.getByLabel('근거 (승격 사유 — 필수)').fill('사용자 제보 승인 — E2E 검증');
  await page.getByRole('button', { name: '좌석 존 승격' }).click();

  // 승격 후 서버 컴포넌트가 새로고침되며 종결 상태 안내로 바뀐다
  await expect(page.getByText('종결된 제보입니다 — 상태 변경·승격이 불가합니다.')).toBeVisible();
});

test('추천 반영 흐름: 승격된 좌석 존이 상영관 상세와 추천 결과에 반영된다', async ({ page }) => {
  await page.goto(`/cinemas/${AUDITORIUM_ID}`);
  await expect(page.getByText('아직 이 관의 좌석 구역 제보가 없어요.')).not.toBeVisible();
  await expect(page.getByText('J~K열 중앙')).toBeVisible();
  await expect(page.getByText('몰입')).toBeVisible();

  await page.goto(RESULTS_URL);
  const card = page.getByTestId('pick-근접·가성비');
  await expect(card).toBeVisible();
  await expect(card).toContainText('CGV 용산아이파크몰 13관');

  // 승격 전: "데이터 없음 — 중립값" / 승격 후: "제보·추정 기반" — 카드 안에서 문구가 바뀌어야 한다
  await expect(card.getByText('좌석 존 데이터 없음')).toHaveCount(0);

  // 결과 페이지 정보 밀도 축소로 이유 목록 중 첫 줄만 기본 노출되고 나머지는 "자세히 보기"
  // 안에 있다.
  await card.locator('summary').filter({ hasText: '점수' }).click();
  await expect(card.getByText('좌석 존은 제보·추정 기반')).toBeVisible();
  await expect(card.getByText('좌석 존 (immersive)')).toBeVisible();
});

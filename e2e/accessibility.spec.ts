// 자동 접근성 검사(axe-core) — WCAG 2.2 AA 규칙 세트, 라이트·다크 모드 둘 다 검사한다
// (다크가 기본값, 라이트는 미디어 쿼리 오버라이드 — app/globals.css). 자동 검사만으로
// 완료 처리하지 않는다(섹션 19) — 스킵 링크·키보드 탐색은 수동으로 별도 확인했다
// (docs/ACCESSIBILITY.md).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];
const SCHEMES = ['light', 'dark'] as const;

interface Violation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: { target: unknown[] }[];
}

async function scan(page: Page) {
  // 페이지 진입 애니메이션(opacity 0→1 페이드) 도중 스캔하면 중간 프레임의 낮은 불투명도가
  // "대비 부족"으로 오탐된다 — reduced-motion을 강제해 전역 CSS(globals.css)가 모든
  // animation/transition을 즉시 끄게 한다(실제로 모션 축소 사용자가 보는 화면과 동일).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
}

function describeViolations(violations: Violation[]) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length}곳\n  ${v.nodes[0]?.target.join(' ')}`)
    .join('\n');
}

async function assertNoViolations(page: Page) {
  const results = await scan(page);
  expect(results.violations, describeViolations(results.violations)).toHaveLength(0);
}

const PAGES = [
  { name: '홈', path: '/' },
  { name: '영화 선택', path: '/movies' },
  { name: '추천 조건 입력', path: '/recommend/1' },
  { name: '상영관 상세', path: '/cinemas/1' },
  { name: '검색', path: '/search?q=CGV' },
  { name: '알파 초대 코드', path: '/alpha/invite' },
  { name: '알파 참여 동의', path: '/alpha/consent' },
  { name: '개인정보 삭제 요청', path: '/privacy' },
  { name: '출처·신뢰도 안내', path: '/sources' },
  { name: '제보 폼', path: '/cinemas/1/report' },
  { name: '관리자 로그인', path: '/admin/login' },
] as const;

test.describe('접근성 자동 검사 (axe)', () => {
  for (const scheme of SCHEMES) {
    test.describe(`${scheme} 모드`, () => {
      test.use({ colorScheme: scheme });

      for (const { name, path } of PAGES) {
        test(name, async ({ page }) => {
          await page.goto(path);
          await assertNoViolations(page);
        });
      }

      test('추천 결과', async ({ page }) => {
        await page.goto('/results?movieId=1&date=2026-07-28');
        await expect(page.getByTestId('pick-균형')).toBeVisible();
        await assertNoViolations(page);
      });

      test('관리자 제보 큐', async ({ page }) => {
        await page.goto('/admin/login');
        await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
        await page.getByRole('button', { name: '로그인' }).click();
        await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
        await page.goto('/admin/reports');
        await assertNoViolations(page);
      });

      test('관리자 개인정보 요청', async ({ page }) => {
        await page.goto('/admin/login');
        await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
        await page.getByRole('button', { name: '로그인' }).click();
        await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
        await page.goto('/admin/privacy-requests');
        await assertNoViolations(page);
      });

      test('관리자 알파 운영 대시보드', async ({ page }) => {
        await page.goto('/admin/login');
        await page.getByLabel('관리자 비밀번호').fill('e2e-admin-pw');
        await page.getByRole('button', { name: '로그인' }).click();
        await expect(page.getByRole('heading', { name: '관리자 대시보드' })).toBeVisible();
        await page.goto('/admin/alpha-ops');
        await assertNoViolations(page);
      });
    });
  }
});

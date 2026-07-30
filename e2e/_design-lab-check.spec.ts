// Design Lab 3개 시안용 일회성 검증 스펙 — 정식 회귀 스펙이 아니다(§10 "아직 운영 홈을
// 수정하지 마세요"와 같은 취지로, 이 페이지들은 사용자가 하나를 고르기 전까지 임시다).
// 390/768/1440 스크린샷 캡처 + axe 자동 접근성 검사를 함께 수행한다.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

const CONCEPTS = [
  { id: 'a', path: '/design-lab/a' },
  { id: 'b', path: '/design-lab/b' },
  { id: 'c', path: '/design-lab/c' },
  { id: 'd', path: '/design-lab/d' },
] as const;

const SIZES = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 1200 },
] as const;

for (const concept of CONCEPTS) {
  for (const size of SIZES) {
    test(`design-lab ${concept.id} @ ${size.name} — capture + a11y`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(concept.path);
      await page.waitForLoadState('networkidle');
      // Reveal(scroll-reveal)은 IntersectionObserver로 뷰포트 진입을 감지한다 — 뷰포트
      // 아래쪽 콘텐츠는 실제로 스크롤해서 지나가야 관찰자가 발화한다. fullPage 스크린샷은
      // 문서 전체를 한 번에 렌더링하지만 opacity/transform 같은 JS 상태는 그대로 남아 있어서,
      // 스크롤 없이 바로 캡처하면 아래쪽 섹션이 opacity:0인 채로 찍힌다(실제로 콘셉트 B에서
      // 이 버그로 영화 패널 전체가 빈 화면으로 캡처됨). 끝까지 스크롤해 모든 reveal을
      // 발화시키고 전환이 끝날 때까지 기다린 뒤 캡처한다.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(900);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({
        path: `design/design-lab/${concept.id}/home-${size.name}.png`,
        fullPage: true,
      });

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(
        results.violations,
        results.violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.length}곳`).join('\n'),
      ).toHaveLength(0);
    });
  }
}

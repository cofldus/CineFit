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
  { id: 'e', path: '/design-lab/e' },
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
      // Reveal(scroll-reveal)은 IntersectionObserver로 뷰포트 진입을 감지한다 — 실제로
      // 뷰포트를 "지나가야" 관찰자가 발화한다. 맨 위→맨 아래로 한 번에 점프하는 방식은
      // (이전 버전에서 썼던 방식) 문서 높이가 뷰포트의 2배를 넘으면 중간 구간이 단 한
      // 번도 뷰포트에 걸치지 않아 그 구간의 reveal이 영원히 opacity:0로 남는다 — 실제로
      // 콘셉트 E의 390px 캡처에서 이 버그로 1관·2관 전체가 빈 화면으로 찍혔다(문서 높이가
      // 뷰포트의 3배 이상). 뷰포트 높이 단위로 한 칸씩 내려가며 전체 문서를 훑어야 모든
      // 구간이 한 번은 뷰포트에 걸친다.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        const total = document.body.scrollHeight;
        for (let y = 0; y < total; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, total);
        await new Promise((r) => setTimeout(r, 60));
      });
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

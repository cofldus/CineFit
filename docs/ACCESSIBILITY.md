# 접근성 (구현 기준)

- 기준일: 2026-07-28 | 목표: WCAG 2.2 AA

## 1. 자동 검사 — axe-core (`e2e/accessibility.spec.ts`)

`@axe-core/playwright`로 `wcag2a`/`wcag2aa`/`wcag22aa` 규칙을 라이트·다크 모드 각각,
사용자 화면 7개 + 결과·관리자 제보 큐(로그인 포함) 총 9개 시나리오에서 검사한다
(18 테스트, `npx playwright test e2e/accessibility.spec.ts`로 실행).

**자동 검사만으로 완료 처리하지 않는다** — 이 스펙은 색 대비·랜드마크·폼 라벨 누락처럼
기계적으로 잡히는 위반만 잡는다. 아래 §2~§5는 수동으로 확인한 항목이다.

이 검사로 실제 발견·수정한 문제: 사이트 전체 primary 버튼(흰 글자 온 파란 배경)이
3.2:1로 AA 기준(4.5:1) 미달, 라이트 모드에서 primary/accent/trust-mid/trust-high
텍스트도 3.0~4.1:1에 그침. 해결 방식은 [DESIGN-SYSTEM.md §4](./DESIGN-SYSTEM.md#4-색-대비-정책) 참고.

## 2. 키보드 탐색 (수동 확인)

- 스킵 링크(`.skip-link`, `app/layout.tsx`)가 페이지 진입 후 첫 Tab 정지점인지
  Playwright 스크립트로 직접 확인함(`document.activeElement`가 "본문으로 바로가기"
  링크, href="#main-content").
- 포커스 표시: `.btn:focus-visible, a:focus-visible, input:focus-visible,
  select:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }`
  (app/globals.css) — 모든 상호작용 요소에 적용되는 전역 규칙.
- SegmentedControl은 네이티브 `<input type="radio">` 그룹이라 화살표 키 이동이
  브라우저 기본 동작으로 제공된다(별도 JS 불필요).
- 비교 표(CompareTable)·출처 표는 `tabIndex={0}` + `role="region"` +
  `aria-label`로 가로 스크롤 컨테이너 자체가 키보드로 포커스·스크롤 가능하다.

## 3. 스크린리더

- 장식용 아이콘(components/Icon.tsx 전체, TrustBadge 글리프)은 항상 `aria-hidden` —
  의미는 인접 텍스트가 전달한다.
- 폼 제출 상태는 버튼 텍스트 변경에 더해 `role="status" aria-live="polite"` 인
  `sr-only` 영역으로 별도 공지한다(RecommendForm·ReportForm 제출 버튼).
- 로딩 상태(`loading.tsx` 5개 라우트)는 `aria-busy="true"` + 설명 텍스트, 스켈레톤
  블록 자체는 `aria-hidden`.
- 좌석 구역·상영관 사양 등 상태 배지는 색만으로 구분하지 않는다 — TrustBadge/
  ShowtimeStatusBadge 모두 아이콘+텍스트+색을 함께 표시한다.

## 4. 터치 타깃 · 모션

- 상호작용 요소 최소 높이 44px(`min-h-11` = 2.75rem) — 버튼·링크·체크박스 행·입력
  필드 전반에 일관 적용.
- `@media (prefers-reduced-motion: reduce)` 규칙이 모든 애니메이션·전환을 끈다
  (app/globals.css 최하단).

## 5. 알려진 한계

- axe-core는 정적 접근성 트리 검사이며, 동적 상호작용(모달 포커스 트랩, 드래그 등)은
  이 프로젝트에 해당 패턴이 없어 별도 검증 대상이 아니다.
- 관리자 화면은 레거시 CSS를 유지하는 화면이라 대비 수정만 반영했고, 포커스·랜드마크
  구조를 전면 재검토하지는 않았다(§1의 axe 스캔에 로그인·제보 큐 화면은 포함해 확인함).

# 디자인 시스템 (구현 기준)

- 기준일: 2026-07-28 (5차 마일스톤 UI 리디자인)
- 이 문서는 **실제 구현된 코드**를 기술한다. 최초 비전 문서인 [09 UX/UI](./09-ux-ui.md)는
  14화면 전체 구상(온보딩·마이페이지·SeatMapViewer 등)을 담은 설계 초안이며, 그중 실제로
  만들어진 범위와 세부는 이 문서가 우선한다.

## 1. 토큰 (`app/globals.css`)

```
색상 — 다크 기본(:root), 라이트는 @media (prefers-color-scheme: light) 오버라이드
  bg / surface / surface-raised / border / text / text-sub
  primary        #4C8DFF  — 링크·테두리·포커스 링·아이콘 색. 라이트 모드는 #2A68D9로 어둡게
                             오버라이드(흰 배경 대비 확보, 아래 §4 참고). 다크 모드 그대로 사용
                             가능한 이유: 배경이 이미 어두워 대비가 충분하다.
  primary-strong #2F6FE0  — 흰 글자를 얹는 채워진 배경(버튼·배지·선택된 세그먼트) 전용.
                             라이트/다크에서 값이 동일해도 되는 이유: 흰 글자 대비는
                             배경색 자체에만 좌우되고 모드에 따라 안 바뀐다.
  accent         #8B7CF6  — 포맷 태그·좌석 목적 태그. 라이트 모드는 #6A4FE0로 오버라이드.
  trust-high/mid/low — TrustBadge 색. 라이트 모드는 trust-mid(#8F5C0C)·trust-high(#167A48)만
                        어둡게 오버라이드(대비 미달 확인, trust-low는 이미 충분).
라운드: radius 12 / radius-lg 16 / radius-xl 20 (Tailwind: rounded-card/-lg/-xl)
그림자(elevation-1..4 → shadow-card/-float/-modal/-highlight):
  1 기본 카드 / 2 떠 있는 컨트롤 / 3 모달 / 4 강조 결과(1순위 추천 카드 테두리+글로우)
컨테이너 폭(container-content/-wide → max-w-content/-wide):
  content 40rem(640px) — 읽기 중심 화면 전체, 결과·상세 화면의 설명/폼 구획
  wide    72rem(1152px) — 헤더, 영화 그리드, 결과 카드 3열, 상영관 상세 2열 그리드
  화면 전체가 wide인 화면(movies/results/cinema detail)도 텍스트 블록은 안에서 다시
  max-w-content로 좁혀 가독성을 지킨다(app/results/page.tsx, app/movies/page.tsx 참고).
타이포: Pretendard, 본문 16px/1.6. 페이지 제목은 text-2xl~4xl font-extrabold로 통일하되
  별도 명명된 타이포 유틸리티 클래스는 만들지 않았다(기존 관례를 그대로 따름).
```

## 2. 아이콘 (`components/Icon.tsx`)

이모지 픽토그램(🚇💰🪑👍👎❓🛠📋🎬💡✏️ 등)을 전부 대체한 자체 SVG 세트. 24×24 viewBox,
`stroke="currentColor"` `strokeWidth={1.75}` 고정, 항상 `aria-hidden`(장식용 — 의미는 옆
텍스트가 전달). 목록: Transit·Price·Seat·ThumbsUp·ThumbsDown·Question·Wrench·Note·Film·
Lightbulb·Edit·Warning·CheckCircle·ExternalLink·ChevronRight·Home·Info.

TrustBadge의 상태 글리프(✔ ◑ ◔ ≈ ? ⏳ ⚠)는 의도적으로 SVG로 바꾸지 않았다 — 이미
색+아이콘+텍스트 병기 원칙(문서 09 §3)을 따르는 확립된 체계이고, 모노크롬 유니코드
심볼이라 컬러 이모지처럼 플랫폼별로 다르게 렌더링되지 않는다.

## 3. 공용 컴포넌트

| 컴포넌트 | 파일 | 비고 |
|---|---|---|
| MobileNav | `components/MobileNav.tsx` | 모바일 하단 내비(홈/영화/출처), `/admin`·`/recommend`에서 숨김(관리자 전용 또는 자체 sticky 바와 충돌) |
| StatusBadge (ShowtimeStatusBadge) | `components/StatusBadge.tsx` | 합성/관리자 확인 회차 배지 — RecommendCard·상영관 상세가 각자 만들던 마크업을 통합. `variant="pill"`(카드용)/`"compact"`(목록 행용) |
| TrustBadge | `components/TrustBadge.tsx` | info_status 8단계 — 기존 컴포넌트 유지 |
| SegmentedControl | `components/SegmentedControl.tsx` | 네이티브 radio 그룹 기반 — 폼 제출(FormData)·키보드 이동·스크린리더 별도 처리 불필요 |
| Skeleton / SkeletonCard | `components/Skeleton.tsx` | 로딩 상태 공용 블록. `aria-hidden` — 안내 문구는 부모의 `aria-busy`+텍스트가 담당 |
| ScreenArt (AspectFrame·HeroVisual) | `components/ScreenArt.tsx` | 포스터 대체 자체 비주얼. AspectFrame은 영화의 실제 화면비를 그대로 시각화(장식이 아닌 데이터 표현), HeroVisual은 홈 히어로용 정적 SVG(스크린 빛+좌석 열 추상화) |
| Notice | `components/Notice.tsx` | info/success 톤, IconWarning/IconCheckCircle 사용 |

## 4. 색 대비 정책

`e2e/accessibility.spec.ts`가 axe-core로 라이트·다크 모드 × 9화면을 자동 검사한다
(WCAG 2.2 AA 태그, `wcag2a`/`wcag2aa`/`wcag22aa`). 처음 도입 시 사이트 전체에서
"serious" color-contrast 위반이 나왔고(§1의 primary-strong 분리, trust-mid/trust-high/
accent 라이트 모드 오버라이드로 해결) 이후 18개 시나리오 모두 위반 0건. 새 색을 추가할
때는 `npx playwright test e2e/accessibility.spec.ts`로 반드시 재확인한다.

## 5. 레이아웃 규칙

- 앱 셸(`app/layout.tsx`): 스킵 링크(`.skip-link`, Tab 첫 정지점으로 확인됨) → 상단 헤더
  (데스크톱 전용 내비, `sm:flex`) → `#main-content` → MobileNav(모바일 전용) 순서.
- 페이지 폭은 화면 성격에 따라 다르다: 단일 흐름 폼(recommend)은 `max-w-xl` 유지(좁은
  단일 컬럼이 데스크톱에서도 더 읽기 쉬움 — 의도적 선택), 비교·그리드가 필요한 화면은
  `max-w-wide`.
- 관리자 화면(`app/admin/**`)은 레거시 CSS(`.card`/`.btn`/`.row`/`.field`/`.badge`)를
  그대로 유지한다 — 전체 재작성은 ADR 없이 진행하지 않는다(문서 지시).

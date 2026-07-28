# CineFit — 영화에 딱 맞는 상영관을 찾아주는 맞춤형 영화 관람 추천 서비스

**시네핏(CineFit)** 은 "이 영화를 내가 볼 수 있는 상영관 중 어디에서, 어떤 포맷과 어느 좌석으로 보는 것이
가장 만족스러운가?"에 답하는 의사결정 도구입니다.

영화의 기술 사양(화면비·촬영 포맷·사운드 믹스), 실제 상영 포맷, 개별 상영관의 설비,
좌석, 사용자 취향, 거리·시간·가격을 결합해 **이유가 설명되는 추천**을 제공합니다.

- 조사 기준일: 2026-07-27
- 설계 문서: [`docs/`](./docs) — 요약 문서 1종 + 상세 설계 문서 12종 (총 13종)
- 검증 레지스터: [`docs/90-verification-register.md`](./docs/90-verification-register.md) — 확정 사실 vs 검증 대기 사실 관리 (robots.txt 실측 2026-07-27 포함)
- 클릭 가능한 Figma 프로토타입(14화면): https://www.figma.com/design/s2ZRp40FUb9tp0yTC3Wraf
- 저장소: https://github.com/cofldus/CineFit

## 첫 마일스톤 PWA (실행 가능)

영화 선택 → 조건 입력 → **실제 추천 엔진 실행** → 균형/품질/근접 3종 결과와
이유·단점·확인 필요 정보·신뢰도·확인일·출처를 보여주는 PWA가 구현되어 있습니다.

```powershell
npm ci
npm run db:seed   # SQLite 시드 (API 키 불필요, Node 24+)
npm run dev       # http://localhost:3000
```

자세한 실행·테스트·구조 설명: [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md)

UI/UX 관련 문서(5차 마일스톤 — 구현 기준):
[디자인 시스템](./docs/DESIGN-SYSTEM.md) ·
[UX 가이드라인](./docs/UX-GUIDELINES.md) ·
[접근성](./docs/ACCESSIBILITY.md) ·
[테스트 가이드](./docs/TESTING.md) ·
[베타 한계](./docs/BETA-LIMITATIONS.md)

알파 테스트 인프라 문서(7차 마일스톤 — 실제 배포 전 코드 인프라만 준비, [알파 계획](./docs/ALPHA-PLAN.md) 참고):
[분석 이벤트](./docs/ANALYTICS.md) ·
[추천 품질 평가](./docs/RECOMMENDATION-EVALUATION.md) ·
[골든 데이터셋](./docs/GOLDEN-DATASET.md) ·
[데이터 품질](./docs/DATA-QUALITY.md) ·
[데이터 보존](./docs/DATA-RETENTION.md) ·
[운영 가이드](./docs/OPERATIONS.md) ·
[관리자 가이드](./docs/ADMIN-GUIDE.md) ·
[개인정보 처리(초안)](./docs/PRIVACY-BETA.md)

> ⚠️ 회차·가격은 검증용 합성 데이터입니다. 상영관 사양은 조사 자료 기반이며
> 항목별 출처·확인일·정보 상태 배지가 함께 표시됩니다.

## 패키지 구조 (계획)

| 패키지 | 역할 |
|---|---|
| `@cinefit/web` | 사용자용 웹/PWA (Next.js) |
| `@cinefit/api` | 백엔드 API 서버 |
| `@cinefit/admin` | 관리자·검수 콘솔 |
| `@cinefit/recommender` | 추천 엔진 (점수 계산·설명 생성) |
| `@cinefit/database` | 스키마·마이그레이션·시드 |
| `@cinefit/ui` | 공용 디자인 시스템 컴포넌트 |

## 설계 문서 목차

| 문서 | 내용 |
|---|---|
| [00 요약](./docs/00-summary.md) | 결론표, 현실적 MVP, 핵심 데이터 문제, 인간 결정 사항 |
| [01 조사 보고서](./docs/01-research-report.md) | 특별관 구조, 데이터 확보 가능성, 경쟁·법적 위험 |
| [02 서비스 전략](./docs/02-service-strategy.md) | 가치 제안, 타깃, 차별점, 수익 모델 |
| [03 PRD](./docs/03-prd.md) | 요구사항, MVP 범위, 승인 기준 |
| [04 정보구조·흐름](./docs/04-ia-user-flows.md) | 사이트맵, 핵심 사용자 여정 |
| [05 추천 엔진](./docs/05-recommendation-engine.md) | 점수 체계, 신뢰도·최신성, 설명 생성, 의사코드 |
| [06 데이터 설계](./docs/06-data-model.md) | ERD, 이력 모델, 출처 추적 |
| [07 데이터 수집](./docs/07-data-collection.md) | 출처 매트릭스, 수집 방식, 법적 검토 |
| [08 아키텍처](./docs/08-architecture.md) | 기술 비교·선정, ADR, 비용 |
| [09 UX/UI](./docs/09-ux-ui.md) | 디자인 원칙, 토큰, 화면 명세, 접근성 |
| [10 구현 계획](./docs/10-implementation-plan.md) | 에픽·스토리·우선순위 |
| [11 테스트 계획](./docs/11-test-plan.md) | 추천 품질, 사실성, 파서, 사용자 테스트 |
| [12 출시 계획](./docs/12-launch-plan.md) | 알파→베타→정식, 운영 매뉴얼 |

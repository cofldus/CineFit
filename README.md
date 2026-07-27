# CineFit — 영화에 딱 맞는 상영관을 찾아주는 맞춤형 영화 관람 추천 서비스

**시네핏(CineFit)** 은 "이 영화를 내가 볼 수 있는 상영관 중 어디에서, 어떤 포맷과 어느 좌석으로 보는 것이
가장 만족스러운가?"에 답하는 의사결정 도구입니다.

영화의 기술 사양(화면비·촬영 포맷·사운드 믹스), 실제 상영 포맷, 개별 상영관의 설비,
좌석, 사용자 취향, 거리·시간·가격을 결합해 **이유가 설명되는 추천**을 제공합니다.

- 조사 기준일: 2026-07-27
- 설계 문서: [`docs/`](./docs) — 조사 보고서부터 출시 계획까지 13종
- 저장소: https://github.com/cofldus/CineFit

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

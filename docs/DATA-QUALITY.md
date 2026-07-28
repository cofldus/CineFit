# 데이터 완성도·품질

- 기준일: 2026-07-28 (7차 마일스톤)

## 상영관 완성도 채점 (`src/domain/dataQuality/completeness.ts`)

8개 신호로 채점한다: 현재 유효 사양 존재, 영사기/스크린/사운드 JSON 존재, 표시 가능
화면비 존재, 좌석 존 존재, 출처 존재, 활성 회차 존재. 등급:

| 등급 | 조건 |
|---|---|
| Stale(오래됨) | 현재 사양은 있지만 `observed_at`이 180일 초과(다른 조건보다 우선) |
| Insufficient(불충분) | 현재 유효 사양 자체가 없음, 또는 통과 비율 40% 미만 |
| Partial(부분적) | 통과 비율 40~75% 미만 |
| Usable(사용 가능) | 통과 비율 75~99% 미만 |
| Complete(완전) | 모든 신호 통과 |

**"접근성"은 채점 대상이 아니다** — `auditoriums`/`auditorium_specs`/`seat_zones` 어디에도
휠체어 접근성 등 상영관 접근성 인프라를 구조화해 저장하는 필드가 없다(사용자 제보 유형에는
`accessibility`가 있지만 구조화 저장 테이블은 없음). 있지도 않은 필드를 채점하지 않고
`/admin/quality`에 이 한계를 그대로 문구로 노출한다. 그 결과 추천 폼의 `wheelchair: true`는
하드 필터에서 모든 관을 제외한다(`docs/GOLDEN-DATASET.md`의 휠체어 시나리오 참고).

## 관리자 품질 대시보드 — `/admin/quality`

- **운영 현황**: 확인된 영화 사양 수, 활성/합성 회차 수, 출처 없는 사양 수, 좌석 존
  미등록 상영관 수, 검토 대기·최근 제보 건수.
- **상영관 데이터 완성도**: 등급별 개수.
- **지역별 완성도**: `cinema_locations.region_code` 기준(현재 시드 데이터는 전부
  `SEOUL_METRO`라 실질적인 지역 분리는 실제 데이터가 늘어야 의미가 생긴다).
- **추천 품질 신호**: 최근 실행(기본 200건) 중 추천 없음 건수, 저신뢰 후보 비율,
  사용자 피드백 기반 실패 원인 분류 집계(`docs/RECOMMENDATION-EVALUATION.md`).
- **상영관별 상세**: 관별 등급·누락 항목 테이블.

`src/data/dataQualityRepository.ts`가 모든 집계 쿼리를 담당하며 순수 조회 전용이다(아무것도
쓰지 않는다).

## 실패 원인 분류 (13종, `src/domain/recommendation/failureClassification.ts`)

`DATA_MISSING`, `DATA_STALE`, `DATA_INCORRECT`, `FORMAT_MISMATCH`, `SEAT_DATA_MISSING`,
`TRAVEL_TIME_ERROR`, `PRICE_ERROR`, `SHOWTIME_MISSING`, `HARD_FILTER_ERROR`, `WEIGHTING_ERROR`,
`EXPLANATION_ERROR`, `UI_MISUNDERSTANDING`, `USER_PREFERENCE_MISSING`. 사용자 피드백 이유
하나가 여러 분류에 동시에 해당할 수 있다(예: `showtime_missing` → `SHOWTIME_MISSING` +
`DATA_MISSING`).

## 유지보수 CLI (`docs/OPERATIONS.md`에 운영 주기 정리)

- `npm run maintenance:stale` — 오래된 사양 리포트(보고만, 아무것도 바꾸지 않음).
- `npm run maintenance:daily` — 상영 종료 회차 자동 비활성화(`showtime_changes`에 이력
  남음) + 위 리포트.
- `npm run maintenance:links` — 예매 링크 검증(`docs/OPERATIONS.md` §예매 링크 검증 참고).

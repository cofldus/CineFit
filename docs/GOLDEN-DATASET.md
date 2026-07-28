# 골든 추천 데이터셋

- 기준일: 2026-07-28 (7차 마일스톤)

## 방법론 — 검증 가능한 주장만 단언한다

추천 엔진의 소프트 랭킹(가중치 점수 순위)은 사람이 "정답"을 직접 매길 근거가 없다 —
1인이 검토했다고 순위 정답을 만들면 그 자체가 또 다른 미검증 주장이 된다. 그래서 이
데이터셋은 **코드로 재구현 가능한 하드 필터 규칙**만 가지고 검증 등급을 나눈다
(`eval/generate-golden-v1.mjs`가 `src/domain/recommendation/engine.ts`의 하드 필터를
그대로 재구현해 `computePassing(movieId, req)`을 계산):

| 필드 | 단언 가능 조건 |
|---|---|
| `mustExcludeAuditoriumIds` | 하드 필터로 항상 제외돼야 하는 관 — 항상 단언 가능 |
| `expectEmpty` | 통과 후보가 0건일 때만 참 |
| `expectedTop1AuditoriumId` | 통과 후보가 **정확히 1개**일 때만 채움(그 외 null) |
| `acceptableTop3AuditoriumIds` | 통과 후보가 1~3개일 때만 채움(그 외 빈 배열) |

통과 후보가 4개 이상이면 순위 관련 필드는 비워둔다 — 소프트 랭킹 결과를 추측해 채우지 않는다.

## 투명성 필드

각 시나리오는 `authors`(작성자), `reviewedByCount`(검토 인원 수), `disagreement`(이견 유무)를
갖는다. 현재는 **1인 검토**다 — 다수 검토자 합의를 거치지 않았다는 사실을 숨기지 않는다.

## 현재 데이터셋 — v1 (`eval/golden/v1.json`)

51개 시나리오, 구성:

| 구성 | 건수 |
|---|---|
| 기본 조건 × 3영화 × 3우선순위 | 9 |
| 포맷 차단 × 3영화 | 9 |
| 4DX/멀미 | 2 |
| 휠체어 × 3영화 | 3 |
| 극단적 이동시간/가격 × 3영화 | 6 |
| 출발지 변화 | 5 |
| 자막·목 편의 선호 × 3영화 | 3 |
| 이중 필터 결합 | 8 |
| 현실적 가격 상한 | 3 |
| 잘못된 날짜 | 3 |

휠체어 시나리오는 항상 `expectEmpty: true`다 — 현재 데이터 모델에 상영관 접근성 필드가
없어 `wheelchair: true`는 하드 필터에서 모든 관을 제외하기 때문이다(허구가 아니라 실제
동작). `docs/DATA-QUALITY.md`의 "접근성 필드 없음" 항목과 같은 근본 원인이다.

## 재생성

```bash
npm run db:seed                       # 시드 회차·상영관이 스크립트 안 하드코딩 값과 같아야 함
node eval/generate-golden-v1.mjs      # eval/golden/v1.json 재생성
npm run eval:recommendations          # 51/51 통과, 필수 제외 위반 0건 재확인
```

시드 데이터(`spikes/minimal-db/seed.mjs`)를 바꾸면 이 스크립트도 같이 갱신해야 한다 —
스크립트 안 `SHOWTIMES`/`FORMAT_VERSIONS`가 시드와 어긋나면 조용히 잘못된 시나리오를 만든다.

## 데이터셋을 키우려면

- 검토자를 1명 더 추가하면 `reviewedByCount`를 올리고, 의견이 갈린 시나리오는
  `disagreement: true`로 표시한다 — 지우거나 다수결로 조용히 덮지 않는다.
- 소프트 랭킹 검증이 필요해지면(예: "이 시나리오는 반드시 균형 pick이 X여야 한다") 별도
  필드(`expectedPick` 등)를 추가하되, 실제 사용자 다수의 합의나 문서화된 도메인 규칙 없이
  임의로 채우지 않는다.

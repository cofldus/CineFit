# 추천 품질 평가

- 기준일: 2026-07-28 (7차 마일스톤)

## 정책 버전 관리

`src/domain/recommendation/policies/`에 정책(`RecommendationPolicy = { version, weights }`)을
버전별로 분리했다. `activePolicy.ts`의 `ACTIVE_POLICY`가 실제 서비스에 쓰이는 단일 출처다.
`POLICY_V1`은 기존 `WEIGHT_PRESETS`를 그대로 감싼 것이고, `POLICY_V2`는 비교용 데모 변형
(균형 프리셋의 W1/W2를 올리고 W7/W8을 낮춤, 합은 항상 1.0으로 검증됨)이다.

정책을 바꾸려면 새 버전 파일을 추가하고 `ACTIVE_POLICY`가 가리키는 파일만 바꾼다 — 과거
`recommendation_runs` 행은 절대 재계산하지 않는다(실행 시점의 `policy_version`·`code_version`을
그대로 남겨 이력이 보존된다).

## 오프라인 평가 CLI — `npm run eval:recommendations`

```bash
npm run db:seed                                  # 골든셋이 참조하는 시드 데이터 준비
npm run eval:recommendations                     # ACTIVE_POLICY로 golden/v1 평가
npm run eval:recommendations -- --dataset=v1
npm run eval:recommendations -- --compare=v1,v2   # 여러 정책 나란히 비교
```

계산 지표(`scripts/eval-recommendations.ts`):

| 지표 | 의미 |
|---|---|
| Top1 일치율 | `expectedTop1AuditoriumId`가 있는 시나리오 중 실제 1위와 일치한 비율 |
| Top3 포함률 | `acceptableTop3AuditoriumIds`가 있는 시나리오 중 실제 결과가 포함된 비율 |
| 필수 제외 위반 | `mustExcludeAuditoriumIds`에 있는 관이 추천에 나타난 건수(항상 0이어야 함) |
| 평균 NDCG@3 | 이진 관련성 기준 순위 품질 |
| 평균 확신도 점수 | confidenceLabel 높음=1/보통=0.5/낮음=0의 평균 |
| 저신뢰 추천 비율 | confidenceLabel이 낮음인 후보 비율 |
| 추천 없음 비율 | 후보가 0건인 시나리오 비율 |
| 설명 필수 요소 누락률 | pros/cons/uncertainties/citations 중 빈 항목이 있는 비율 |
| 잘못된 공식 확정 표현 | 근거 없이 "공식 확정"류 표현이 쓰인 건수(공식/복수출처 인용이 없는데 확정형 문구가 있으면 위반) |
| 평균 실행 시간 | ms 단위 |

결과는 `eval/reports/latest-<정책들>.json`에 저장된다(`.gitignore`에 등록 — 커밋 대상 아님,
데이터셋 자체(`eval/golden/*.json`)만 커밋한다).

**2026-07-28 기준 실제 실행 결과** (v1 정책 × golden v1, 51개 시나리오):
Top1 일치율 100.0%, Top3 포함률 100.0%, 필수 제외 위반 0건, 평균 NDCG@3 1.000,
저신뢰 추천 비율 37.3%, 추천 없음 비율 25.5%, 설명 필수 요소 누락률 0.0%,
잘못된 공식 확정 표현 0건, 평균 실행 시간 0.45ms. (저신뢰·추천없음 비율이 높아 보이는 것은
골든셋이 일부러 하드 필터 경계·극단 조건 시나리오를 다수 포함하기 때문 — `docs/GOLDEN-DATASET.md`.)

## 특정 실행 재계산 비교 — `npm run compare:recommendations`

```bash
npm run compare:recommendations -- --run-id=123 [--policies=v1,v2]
```

`recommendation_runs`에 저장된 과거 실행의 요청(request)을 그대로 복원해 현재 후보로
다시 계산하고, 정책별 pick·점수 차이·순위 변동 건수를 출력한다(`scripts/compare-recommendations.ts`).
**정책을 바꾼 이유는 자동으로 기록되지 않는다** — 정책 변경 시 왜 바꿨는지는 커밋 메시지나
`ACTIVE_POLICY` 파일 주석에 사람이 직접 남겨야 한다.

## 사용자 피드백 → 실패 분류

추천 결과 화면의 `FeedbackWidget`/`SelectionWidget`이 `recommendation_feedback`/
`recommendation_selections`에 즉시 피드백·실제 선택을 남긴다. `feedbackService.countFailureCategories()`가
피드백 이유(`src/lib/feedbackValidation.ts`)를 13개 실패 분류(`src/domain/recommendation/failureClassification.ts`)로
매핑해 집계하고, `/admin/quality`에 노출한다. 관람 후 만족도(`post_watch_surveys`)는 해당 회차의
상영 시작 시각이 지난 뒤에만 제출할 수 있다(`src/data/postWatchService.ts`).

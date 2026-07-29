# 독립 holdout·적대적 평가

- 기준일: 2026-07-29 (8차 마일스톤)
- `docs/GOLDEN-DATASET-AUDIT.md`에서 발견한 development 세트(v1)의 편중을 메우기 위한
  두 번째·세 번째 평가 세트. `docs/GOLDEN-DATASET.md`(방법론)와 `docs/RECOMMENDATION-EVALUATION.md`
  (정책 평가 전반)를 먼저 읽을 것.

## 세 세트의 역할 분리

| 세트 | 파일 | 용도 |
|---|---|---|
| development | `eval/golden/v1.json` | 정책 튜닝 중 자유롭게 참고 |
| holdout | `eval/golden/holdout-v1.json` | 최종 검증 전용 — 결과를 보고 즉시 규칙을 고치지 않는다 |
| adversarial | `eval/adversarial/v1.json` | 정답이 아니라 논리적 불변식 확인 |

**holdout을 쓰는 규칙**: 정책을 만들거나 바꿀 때는 development로 반복 확인하고, holdout은
"이제 됐다"고 생각한 뒤 마지막에 한 번만 돌린다. holdout 결과가 나쁘다고 그 자리에서
바로 규칙을 고쳐 다시 holdout을 돌리면, 그 순간부터 holdout이 아니라 development가 된다
— 그렇게 됐다면 정직하게 기록하고 새 holdout 버전을 만든다.

## Holdout v1 — 33개 시나리오

`eval/generate-golden-holdout.mjs`가 생성한다(v1과 동일한 방법론 — 하드 필터를
`engine.ts`에서 독립적으로 재구현해 계산, 실제 엔진을 실행해 정답을 베끼지 않는다).
v1 감사에서 드러난 편중을 의도적으로 메웠다:

- quality 우선순위 × 3영화 × 3출발지(9건) — v1은 quality를 cityhall에서만 3건 봤다.
- logistics 우선순위 × 3영화 × 3출발지(9건) — v1은 logistics도 cityhall뿐이었다.
- 현실적인 이동시간 상한 30/45/90분(3건) — v1은 1분·200분 극단값뿐이었다.
- 좌석 선호(자막·목 편안) × 가격 상한 2만원 동시 적용(3건).
- 멀미 약간(1) + IMAX 비허용 동시 적용(1건).
- quality/logistics × 가격 상한 2만원 동시 적용(6건).
- 이동시간+가격을 동시에 현실적으로 좁힌 조합(2건).

**2026-07-29 실행 결과** (ACTIVE_POLICY): 33/33 통과, Top1 100%, Top3 100%, 필수 제외
위반 0건. 저신뢰 추천 비율이 **97.0%**로 development(37.3%)보다 훨씬 높게 나왔다 —
quality/logistics 우선순위와 다양한 출발지 조합에서 확신도가 낮게 나오는 경향이 있다는
뜻이다. 이 자체는 버그가 아니라(확신도는 데이터 근거 품질에서 오는 것이지 우선순위
선택에서 오지 않아야 하는데, 실제로 낮게 나온다면 확인이 필요하다는) 다음 마일스톤에서
조사할 신호로 기록해 둔다.

```bash
npm run eval:recommendations -- --dataset=holdout-v1
```

## 적대적 평가 v1 — 13개 케이스

정답을 맞히는 대신, "기본 요청"과 "살짝 바꾼 요청"의 결과 사이에 반드시 성립해야 하는
관계(불변식)를 확인한다(`scripts/eval-adversarial.ts`).

| 불변식 | 의미 | 예시 |
|---|---|---|
| `subset_or_equal` | 조건을 좁히면 후보가 늘어날 수 없다 | 이동시간 200→20분, 가격 10만→1.5만원 |
| `format_removed:<포맷>` | 그 포맷을 막으면 결과에서 완전히 사라져야 한다 | IMAX/Dolby/일반관 비허용, 멀미 2단계(4DX 제외) |
| `unchanged_candidate_set` | 소프트 조건만 바꾸면 하드 필터 통과 집합은 그대로여야 한다 | 자막·목 편안 선호, 우선순위 변경 |
| `expect_empty_after` | 휠체어 필수로 바꾸면 결과가 비어야 한다 | 접근성 필드 자체가 없는 현재 데이터 모델의 알려진 한계 |

**2026-07-29 실행 결과**: 13/13 통과(ACTIVE_POLICY). 전부 실제 엔진(`recommend()`)을
두 번씩(기본/변형) 실행해 비교한 결과다.

```bash
npm run eval:adversarial
npm run eval:adversarial -- --dataset=v1 --policy=v2   # 다른 정책으로 비교
```

## CI 회귀 게이트

`tests/unit/goldenHoldoutAndAdversarial.test.ts`가 `npm test`에 포함돼 있다 — holdout이
30건 미만이 되거나, development와 id가 겹치거나, ACTIVE_POLICY에서 하나라도 실패하거나
하드 필터 위반이 생기면 CI가 실패한다. 적대적 평가도 마찬가지로 불변식 위반 시 CI가
실패한다.

## 다루지 않은 것 (정직하게 남기는 한계)

- **검증된 회차(관리자 확인) vs 사용자 제보 회차**를 바꿔치기하는 적대적 케이스는 만들지
  않았다 — 같은 상영관·시간에 두 종류 회차를 동시에 구성하려면 시드 데이터 구조를 바꿔야
  해서 이번에는 범위 밖으로 뒀다.
- **오래된 사양 vs 최신 사양**을 바꿔치기하는 케이스도 마찬가지 이유로 다루지 않았다.
- 홀드아웃은 여전히 **같은 3편의 영화·10개 상영관** 시드 데이터를 재사용한다 — "이전에
  없던 영화·상영관 조합"을 문자 그대로 만족하려면 새 시드 데이터가 필요한데, 이번
  마일스톤은 새 조건 조합(우선순위·출발지·이동시간·가격의 새로운 조합)으로 이 요구를
  충족했다. 완전히 새로운 영화·상영관 데이터로 만드는 holdout은 다음 후보로 남긴다.

# 추천 정책 v3-axis100 (R20 동결판)

기준 커밋: `75e6039` (태그 `r20-stable`, 2026-08-04) · 구현: `src/domain/recommendation/axisWeights.ts`

> **동결 원칙**: 알파 검증 전까지 이 정책(가중치·hard/soft constraint 구조·상태 모델)과
> 현행 UI는 변경하지 않는다. 추천 점수·가중치를 조정하려면 반드시 **새 정책 버전**
> (`v4-…`)을 만들어 `policy_version`으로 구분 기록해야 하며, v3 값의 무버전 수정은 금지.

## 1. 가중치 축 (4축, 합 100 고정)

| 축 | 라벨 | 엔진 요인 배분 |
|---|---|---|
| `screen_sound` | 화면·음향 | W1(포맷 매칭) 45% · W2(상영관 품질) 35% · W3(상영 버전 적합) 20% |
| `seat` | 좌석 | W4 100% |
| `travel` | 이동 | W7 100% |
| `price` | 가격 | W8 100% |

- W5(개인화)·W6(접근성 적합)은 스파이크 범위 밖 중립값이라 0.
- 시간대는 Step 1 **하드 필터**이므로 가중치 축이 아니다.

## 2. 1·2순위 → 배분 규칙

상대 배수: **1순위 ×3.2 · 2순위 ×2.3 · 나머지 ×1** (균형 선택 시 2순위만 있으면 ×1.6).
실수 배분을 **largest remainder** 방식으로 정수화해 어떤 조합에서도 합이 정확히 100
(동률 소수부는 축 순서 screen_sound→seat→travel→price로 결정적).

예시 (검증 테스트 `tests/unit/axisWeights.test.ts`):
- 균형 + 없음 = 25 / 25 / 25 / 25
- 화면·음향 1순위 + 좌석 2순위 = **43 / 31 / 13 / 13**
- 화면·음향 1순위 단독 = 52 / 16 / 16 / 16
- 구 `logistics` 값은 travel 축으로 흡수(하위호환).

## 3. Hard constraints (점수 상쇄 절대 금지)

1. 운영 중이 아닌 극장·상영관
2. 배급 버전 미확인 포맷
3. 허용하지 않은 포맷(allowImax/allowDolby/allowStandard)
4. 움직이는 좌석 회피 시 모션 시트 포맷(4DX — capability 기준으로 관리)
5. 희망 상영 시작 시간대(Asia/Seoul, 시작 시각 기준)
6. 편도 이동 한도(직선거리 근사 — "예상" 표기 필수)
7. 휠체어 접근 필요 시 미확인 상영관 제외
8. (레거시 전용) 구 URL의 절대 가격 상한 `maxPrice`

## 4. Soft preferences (감점만, 제외 금지)

- **가격**: 기준 `priceRef` = 조건 내 일반관(standard·superplex) 최저가 + 추가 지불 의향
  (가격 최우선 +0 / +5,000 / +10,000). 초과분 감점 = `min(0.5, 초과액/10,000 × 0.35)`
  을 가격 축(pv)에서 차감. '가격 차이를 크게 고려하지 않음'은 `priceRef = null`(감점 없음).
- **큰 화면 멀미**: IMAX 또는 실측 폭 28m 이상 → 화면 축(ffm) −0.35.
- 가격 데이터가 추정·불완전해도 후보를 제외하지 않는다.

## 5. 상태 모델 (후보 계산)

`idle → calculating → ready | zero_results | unavailable | stale`
- `unavailable`: 관리자 확인 회차 없음(합성/미등록) — 후보 수 숫자 노출 금지,
  '회차 데이터 연결 전' 안내.
- `stale`: 마지막 확인(verifiedAt ?? dataCheckedAt) 7일 초과(`src/lib/dataFreshness.ts`).

## 6. 의도적 판단 기록 (R20)

1. **이동시간은 '확인된 사실'이 아니다** — 직선거리(22km/h + 12분 오버헤드) 근사이므로
   결과 화면에서 'CineFit 계산 · 이동(근사) · 직선거리 추정'으로 분류·표기한다.
   교통 API 연결 전에는 확정 소요시간처럼 표현하지 않는다.
2. **회피 조건 요약은 선택분만** — Step 3 완료 전 기본값을 요약에 노출하지 않는다.
3. **MX4D**: 데이터 모델에 아직 포맷이 없어 4DX만 하드 제외 대상이며, 모션 시트 판단은
   format capability registry로 관리해 MX4D 추가 시 자동 반영되게 한다(R21).

## 7. 동결 시점 테스트 결과 (2026-08-04)

- 유닛 298 passed (axisWeights 전 조합 합 100, R20 시나리오, soft price, 시간대 필터)
- E2E 88 passed (functional 64 + visual 24, CI 동일 컨테이너)
- 시각 베이스라인 24장, GitHub Actions run success (`75e6039`)

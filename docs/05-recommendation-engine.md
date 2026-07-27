# 문서 5. 추천 엔진 명세

- 조사 기준일: 2026-07-27 | 서비스: CineFit(시네핏) | 패키지: `@cinefit/recommender`

## 1. 개요

입력(영화, 사용자 조건, 시간창) → **후보 생성**(회차 단위) → **하드 필터** → **11개 축 점수 계산**
→ **신뢰도·최신성 보정** → **다양성 선택**(균형/품질/근접 3종) → **설명 생성** → 결과.

추천 단위는 극장도 상영관도 아닌 **회차(showtime)+현재 좌석 상황**이다.

## 2. 입력

```ts
interface RecommendationRequest {
  movieId: string;
  origin: GeoPoint | RegionCode;        // 정확 좌표는 단말 처리, 서버엔 지역 축소 가능
  timeWindow: { from: DateTime; to: DateTime };
  maxTravelMinutes?: number;            // 기본 60
  topPriority: Priority;                // 큰화면|화질|사운드|좌석편안|체험효과|거리|가격|좌석확보|작품충실
  advanced?: {
    maxPrice?: number;
    chains?: { prefer: ChainId[]; avoid: ChainId[] };
    formats?: { prefer: FormatId[]; allow: FormatId[]; exclude: FormatId[] };
    seatTendency?: 'front'|'middle'|'back';
    sensitivity?: { motionSickness: 0|1|2; loudness: 0|1|2; brightness: 0|1|2; neckBack: 0|1|2 };
    accessibility?: { wheelchair?: boolean; gachibom?: boolean; companions?: ('child'|'senior'|'pregnant')[] };
    transport: 'car'|'transit';
    viewingCount: 'first'|'rewatch';
  };
}
```

## 3. 하드 필터 (점수 상쇄 절대 금지)

| 필터 | 규칙 |
|---|---|
| 시간창 | 시작~예상 종료(광고 포함)가 timeWindow 내. "23시 전 종료" 질의 지원 |
| 이동 한도 | 이동시간 > maxTravelMinutes → 제외 |
| 가격 한도 | 가격 > maxPrice → 제외 |
| 접근성 | wheelchair=true인데 휠체어석/경로 미확인 관 → 제외 (미확인도 제외, "확인되지 않음" 사유 표시) |
| 멀미 민감 2 | 4DX·모션 회차 제외 |
| 기피 체인·포맷 exclude | 제외 |
| 운영 상태 | 휴업·폐점·리뉴얼 중 관 제외 |
| 매진 | Availability=0 확인 시 제외(미확인이면 잔여 미확인 표시로 유지) |

## 4. 11개 점수 축 (각 0~1)

### 4.1 FilmFormatMatch — 영화 사양 × 상영 포맷 적합도
핵심 원칙: **포맷 브랜드가 아니라 영화가 그 포맷의 장점을 실제로 쓰는지**로 점수화.

```
IMAX 회차 예:
 +0.35 확장 화면비 적용 '공식 확인' (1.43 또는 1.90)
 +0.15 Filmed for IMAX 인증 카메라 촬영
 +0.20 관의 지원 화면비가 영화 확장비를 실제 표시 가능 (1.43 콘텐츠 × CoLa관이면 0)
 +0.15 IMAX 사운드 믹스 확인
 +0.15 장르 시각 스펙터클 가중 (액션·우주·자연다큐 등)
 확장비 '미확인'이면 화면비 항목은 0.35 → 0.10(잠정) + 설명에 '확인되지 않음' 명시
Dolby Cinema 예: Dolby Vision 마스터(+0.30), Atmos 믹스 공식 확인(+0.25),
 어두운 장면 비중·명암 중요도(+0.25), HDR 무관 작품(흑백·구작 SDR)이면 감쇠(+0.20→해석 라벨)
4DX 예: 4DX 버전 제작 확인(필수, 없으면 후보 아님), 효과-서사 궁합(+), 대사 중심 드라마면 감점
일반관: 시네마스코프 영화 × 스코프 마스킹 지원 대형관이면 특별관 못지않은 고점 가능
```

### 4.2 AuditoriumQuality — 관 설비 절대 품질
스크린 크기·영사(레이저/4K/밝기)·사운드 시스템·마스킹 지원·단차 구조의 가중합.
값은 `auditorium_specs`의 검증 데이터만 사용, 항목 결측 시 중립값 0.5 + DataConfidence 감점.

### 4.3 PresentationMatch — 해당 회차가 실제 제공하는 사양
회차 포맷 버전(IMAX/일반/자막/더빙/HFR/3D)이 사용자의 요구와 영화 사양에 부합하는 정도.
"IMAX관 보유"≠"IMAX 회차" 구분이 여기서 강제된다.

### 4.4 SeatQuality — 현재 선택 가능 좌석의 적합도
MVP는 잔여 좌석 미수집 → **좌석 등급 존 기반 근사**(관별 목적 존이 넓게 남아있을 가능성)와
사용자 제보(예: "주말 저녁 이 관은 중앙이 빨리 참") 통계로 추정, `추정` 라벨 필수.
제휴 후: 실제 잔여 좌석 × 목적별 존 매칭.

### 4.5 UserPreferenceMatch — 학습된 개인 취향 (콜드스타트 §9)
### 4.6 AccessibilityFit — 하드 필터 통과 후의 편의 정도 (엘리베이터 거리, 단차 등)
### 4.7 Convenience — 이동시간·환승·주차·심야 귀가 교통
### 4.8 PriceValue — 가격 대비 기대 만족 (품질 점수/가격 정규화)
### 4.9 DataConfidence — 위 점수들이 딛고 있는 데이터의 신뢰도

```
소스 등급 가중: 공식 확인 1.0 / 복수 출처 0.85 / 사용자 제보(복수 일치) 0.7
 / 사용자 제보(단일) 0.5 / 단일 출처 미확인 0.4 / 추정 0.3 / 출처 충돌 0.25
축별 사용 데이터의 최소-평균 혼합: conf = 0.5*min + 0.5*mean
```

### 4.10 Freshness — 최신성 감쇠

```
freshness(d) = exp(-ln2 * d / H)   // d = 마지막 확인 후 경과일, H = 반감기
H: 회차·가격 1일 / 좌석배치·시설 제보 90일 / 관 사양 365일(리뉴얼 이벤트 시 즉시 0으로 리셋)
```

### 4.11 Availability — 예매 가능성 (예매 오픈 여부, 매진 신호, 오픈 예정일)

## 5. 최종 점수

```
Quality   = W1*FilmFormatMatch + W2*AuditoriumQuality + W3*PresentationMatch + W4*SeatQuality
Personal  = W5*UserPreferenceMatch + W6*AccessibilityFit
Logistics = W7*Convenience + W8*PriceValue
Base      = Quality + Personal + Logistics                  // ΣW = 1
Trust     = 0.6 + 0.4 * (0.7*DataConfidence + 0.3*Freshness) // 0.6~1.0 곱셈 보정
Final     = Base * Trust * AvailabilityGate                  // Gate: 예매불가 0, 미확인 0.9, 가능 1.0
Confidence(표시용 확신도) = DataConfidence * Freshness 기반 3단계(높음/보통/낮음)
```

**topPriority에 따른 초기 가중치 프리셋** (이후 골든셋·사용자 행동으로 튜닝):

| topPriority | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 |
|---|---|---|---|---|---|---|---|---|
| 기본(균형) | .18 | .15 | .12 | .12 | .10 | .05 | .18 | .10 |
| 큰 화면/화질/사운드 | .25 | .22 | .15 | .10 | .08 | .05 | .10 | .05 |
| 거리/가격 | .10 | .08 | .08 | .08 | .08 | .05 | .30 | .23 |
| 작품 충실 포맷 | .32 | .15 | .18 | .08 | .07 | .05 | .10 | .05 |
| 좌석 편안/확보 | .12 | .12 | .10 | .28 | .08 | .10 | .12 | .08 |

페널티: 기피 조건(avoid 체인 등)은 Final × 0.5, 필수 조건은 필터(§3).
**포맷 브랜드 가산점 금지 규칙**: FilmFormatMatch < 0.4인 특별관 회차는 W2(설비 품질)의 절반만 인정
— "영화가 포맷 장점을 못 쓰면 브랜드로 못 올라온다".

## 6. 결과 선택 (다양성)

1. **1순위 균형**: Final 최고.
2. **2순위 품질**: Quality 축 최고 (1순위와 동일 관이면 차순위 관), "무엇이 좋아지고 무엇을 포기하는지" 델타 표시.
3. **3순위 근접·가성비**: Logistics 축 최고, 품질 격차 명시.
4. 부가 답변: 특별관 불필요 판정(모든 특별관 FilmFormatMatch < 0.45 && 일반관 상위), IMAX vs Dolby 비교(두 축 강점 대비), 첫/N차 조합, 대기 vs 예매(시간창 내 미래 회차의 기대 점수 비교), 대체 상영관, **결론을 바꿀 수 있는 미확인 정보 목록**(확장비 미확인 등).

## 7. 설명 생성

각 카드의 설명은 점수 계산에 실제 사용된 특징량에서만 생성한다(템플릿 기반, LLM은 문장 다듬기만).

```
reason[]  : 기여도 상위 3개 특징 (예: "1.90:1 확장 화면비 공식 확인", "Atmos 믿스 확인", "이동 18분")
tradeoff[]: 부정 기여 상위 2개 (예: "가격 8,000원 높음", "남은 좌석 정보 미확인")
uncertain[]: DataConfidence 하락 요인 (예: "IMAX 확장비 미확인 — 확인되면 순위가 바뀔 수 있음")
meta      : 확신도(높음/보통/낮음), 마지막 확인일, 출처 요약
```

## 8. LLM 가드레일

- LLM은 (a) 자연어 질의 → 구조화 조건 파싱, (b) 설명 문장 정리에만 사용.
- 사양·회차·가격·좌석 사실은 **DB 레코드 ID를 인용**해야 하며, 인용 없는 사실 문장은 후처리에서 제거.
- 개봉 전 영화: 리뷰·평가 텍스트 생성 금지, `movie_releases.status`로 게이트.
- 위반 탐지는 문서 11 §2 사실성 테스트로 회귀 검증.

## 9. 콜드 스타트·개인화

- 신규 사용자: topPriority 1개만으로 프리셋 가중치 적용. UserPreferenceMatch는 중립 0.5.
- 행동 학습(암묵): 추천 대비 실제 선택(딥링크 클릭)의 편차로 가중치를 사용자별 미세 조정
  (예: 항상 3순위 가성비를 고르면 W7·W8 상향). 관람 후 1문항 피드백("만족했나요?")으로 보정.
- 명시 설정이 항상 학습값에 우선. 학습값은 마이페이지에서 열람·초기화 가능(투명성).

## 10. 의사코드

```python
def recommend(req):
    movie = load_movie_with_specs(req.movie_id)          # 사양 + 정보상태
    shows = load_showtimes(movie, req.time_window, region_of(req.origin))
    shows = [s for s in shows if pass_hard_filters(s, req)]
    if not shows:
        return relaxation_suggestions(req)               # 거리·날짜 완화 제안
    scored = []
    for s in shows:
        aud  = current_specs(s.auditorium, at=s.start_time)   # 이력 모델에서 유효 사양
        f    = features(movie, s, aud, req)              # 11축 원천 특징량
        base = weighted_sum(f, preset(req.top_priority), personal(req.user))
        trust = 0.6 + 0.4*(0.7*f.data_confidence + 0.3*f.freshness)
        final = base * trust * availability_gate(s)
        if f.film_format_match < 0.4 and aud.is_premium:
            final -= 0.5 * preset_w2(req) * f.auditorium_quality   # 브랜드 가산 차단
        scored.append((s, f, final))
    picks = select_diverse(scored)                       # 균형/품질/근접
    return [explain(p) for p in picks] + supplementary_answers(scored, movie)
```

## 11. 평가 (문서 11과 연동)

- 골든셋: (영화, 사용자 조건, 후보 회차, 전문가 정답 순위) 30 → 100케이스.
- 지표: Top1 일치율, Top3 포함률, NDCG@3, 설명 이해도(사용자 설문), 추천 후 선택률·만족도.
- 가중치 튜닝: 골든셋 그리드 서치 → 베타에서 온라인 A/B(단, 접근성·사실성 규칙은 튜닝 대상 아님).

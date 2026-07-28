# 사용자 제보 데이터 승격 정책

사용자 제보(issue_reports)가 추천 데이터에 반영되기까지의 규칙. 코드 기준점:
`src/domain/trust/confidencePolicy.ts`(숫자는 그 파일에서만 관리),
`src/data/reportPromotionService.ts`(집행), `docs/05-recommendation-engine.md` §4.9(신뢰도 어휘).

## 원칙

1. **제보는 곧바로 데이터가 아니다.** 제보 생성만으로는 어떤 추천 결과도 바뀌지 않는다.
   반영은 관리자 검토를 거친 명시적 승격으로만 일어난다.
2. **승격은 관찰 기록을 거친다.** 모든 승격은 observations(불변 로그)에 관찰을 남기고,
   엔터티 반영 시 그 관찰을 출처(source_observation_id)로 연결한다.
3. **덮어쓰기·삭제 금지.** 기존 좌석 존은 대체(supersedes) 계보로만 교체된다 —
   이전 존은 is_active=0, valid_to 마감으로 남는다. 제보 원문도 수정하지 않는다.
4. **official 승격 금지.** 사용자 제보의 info_status는 언제나 `user_report`다.
   공식 확인이 생기면 그것은 별도의 공식 관측(어댑터·관리자 확인)으로 기록한다.
5. **모든 처리는 audit_logs에 남는다.** 개인정보(이메일·자유 입력 전문)는 로그에 넣지 않는다.

## 신뢰도 상한 (confidencePolicy.ts)

관리자가 신뢰도를 요청해도 아래 상한을 넘을 수 없다.

| 조건 | 상한 |
| --- | --- |
| 단일 사용자 제보 | 0.55 |
| 증빙 URL이 있는 단일 제보 | 0.65 |
| 서로 다른 세션의 복수 독립 제보 일치 | 0.75 |

- "독립"은 anonymous_session_hash가 다른 제보 수로 판정한다(반려·중복 제외, 본인 포함).
- 0.75를 넘는 신뢰도는 공식 출처(관리자 직접 확인 0.85, 공식 API 등)에서만 나온다.

## 상태 흐름

```
submitted → under_review → needs_more_information (반복 가능)
         ↘ rejected / duplicate            (종결 — 승격 불가, resolution 기록)
         ↘ approved_as_observation         (관찰 기록만 — 추천 미반영)
         ↘ promoted                        (엔터티 반영 완료 — 종결, 되돌리기 없음)
```

- promoted는 최종 상태다. 잘못 승격했다면 새 관측·새 존으로 다시 대체한다(계보 유지).
- approved_as_observation에서 좌석 존 승격 시 기존 관찰을 재사용한다(중복 생성 금지).

## 좌석 존 승격 (report_type=seat_zone, target=auditorium 한정)

- purpose는 docs/06 §3.2 어휘만 허용 (`src/lib/adminReportValidation.ts` SEAT_ZONE_PURPOSES).
- 근거(rationale)는 필수 — 왜 이 제보를 믿는지 남긴다.
- 대체 대상은 같은 상영관의 활성 존만 가능하다.

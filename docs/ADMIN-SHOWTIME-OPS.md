# 관리자 회차 운영 가이드 (R21)

## 수동 등록 (`/admin/showtimes/new`)

- 공식 예매 페이지에서 사람이 직접 확인한 회차만 등록한다.
- 필수: 공식 예매 URL(bookingUrl), 정보 출처(sourceNote). '확인한 공식 페이지 URL'을
  비우면 예매 URL이 source_url로 저장된다(항상 non-null — sourceUrl 필수 원칙).
- 확인 시각(checkedAt)·검증 시각(verifiedAt)은 저장 시점으로 자동 기록된다.
- '시작 시각'에 `10:30, 14:00, 19:00`처럼 콤마로 여러 회차를 한 번에 등록할 수 있다.
- 동일 상영관·시작 시각의 활성 회차는 중복 등록되지 않는다(서비스 검증 + DB 부분
  유니크 인덱스 `ux_showtimes_active_slot`).

## CSV 일괄 등록 (`/admin/showtimes/import`)

1. '템플릿 CSV 내려받기'로 형식 확인. 헤더:
   `provider,theater,auditorium,movie,showDate,startsAt,format,price,sourceUrl,checkedAt,expiresAt,verificationStatus`
2. 파일 선택 또는 붙여넣기 → **미리보기(검증만)** — 행별 매핑 결과·오류 확인.
   - 영화: 제목 정확 일치 또는 `movie_aliases` 별칭('듄2' 등).
   - 상영관: `auditorium_aliases` 별칭('용아맥' 등) 또는 극장명(부분 일치)+관 번호(정확 일치).
   - `sourceUrl`(http/https)·`checkedAt`(ISO) 필수. 과거 시각·중복 회차·브랜드 불일치
     포맷은 오류 행이 된다.
3. '오류 행 CSV 내려받기'로 실패분만 고쳐 재업로드.
4. **등록** — 유효 행만 저장된다. import 회차는 항상 실제 데이터(is_synthetic=0)이며
   `provider`, `entry_method='manual'`, `showtime_changes`(actor `admin(csv)`) 이력이 남는다.
   합성(synthetic) 데이터는 CSV로 넣을 수 없다 — 합성은 시드 스크립트 전용.

## 자동 만료

- `npm run maintenance:daily`(Vercel cron 동일)가 매일:
  1. 상영이 끝난 활성 회차를 `disabled` 전환(이력 기록),
  2. `COALESCE(expires_at, starts_at)`이 지난 회차를 `verification_status='expired'`로 표시.
- `expiresAt`을 비우면 시작 시각이 만료 기준이 된다.

## 추천 추적 (`/admin/runs`)

- 최근 실행 50건 목록 → 상세에서 입력 조건·4축 가중치(합 100)·하드 필터 퍼널(단계별
  제외/잔여)·후보별 4축 점수·soft 감점·제외 사유를 확인한다.
- '이 조건으로 재현'은 저장된 요청을 /results URL로 복원해 같은 조건으로 새 실행을 만든다.
- trace 스키마: `src/domain/recommendation/trace.ts` (`recommendation_runs.trace`, v1).

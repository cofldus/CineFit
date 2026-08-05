# 프로덕션 스모크 테스트 — R21.1 Alpha Readiness

대상: https://cine-fit.vercel.app (Supabase PostgreSQL). 배포 직후·알파 시작 전에 순서대로
수행한다. 소요 약 15분. 실패 항목이 하나라도 있으면 알파를 시작하지 않는다.

## 0. 헬스·마이그레이션

1. `GET /api/health` → `{"status":"ok","dbProvider":"postgres"}` 확인.
   - `migrations.latestApplied`가 `009_r21_showtime_ops_trace.sql`인지 확인.
   - `status:"degraded"` + `pendingMigrations`가 오면 **중단** →
     `DATABASE_PROVIDER=postgres npm run db:migrate` 후 재확인 (`npm run db:status`로도 교차 확인).
2. 프로덕션은 `CINEFIT_ENV=production`이어야 한다(합성 회차 하드 차단 전제).

## 1. 실제 회차 1건 입력

1. `/admin/login` 로그인 → `/admin/showtimes/new`.
2. 극장사 공식 예매 페이지에서 **직접 확인한** 회차 1건 입력:
   - 확인한 공식 페이지 URL(sourceUrl)·공식 예매 URL 모두 공식 도메인
     (cgv.co.kr / lottecinema.co.kr / megabox.co.kr)만 저장된다 — placeholder는 422로 거부돼야 정상.
   - '검증용 합성 데이터' 체크 해제 상태 확인.
3. 저장 후 `/admin/showtimes` 목록에서 `✔ 관리자 확인` 표시 확인.
4. (선택) 같은 회차를 다시 저장 → "이미 존재" 오류(중복 방지) 확인.

## 2. 추천 확인

1. 해당 영화의 `/recommend/{movieId}`에서 등록한 날짜로 조건 입력 → 결과 확인.
2. 결과 상단 배너가 **'관리자가 공식 예매 페이지에서 확인한 회차 기준'**인지 확인
   ('회차 데이터 연결 전'이 뜨면 게이트에서 떨어진 것 — 3의 trace로 사유 확인).
3. 1위 카드 '확인된 사실'에 확인일이 표시되는지 확인.

## 3. Trace 확인

1. `/admin/runs` → 방금 실행 상세.
2. 검증 게이트/하드 필터 퍼널 카운트와 후보별 4축 점수·제외 사유가 채워져 있는지 확인.
3. '이 조건으로 재현' 링크로 같은 조건의 새 실행이 만들어지는지 확인.

## 4. 이벤트 확인

1. 위 과정을 거치며 `/admin/alpha-ops`에서:
   - 사용 퍼널의 step1~3·추천 생성 카운트 증가 확인.
   - 정책 버전별 결과에 `v3-axis100` 행 확인.
2. 이벤트 속성에 좌표·주소가 없는지는 코드 레벨에서 보장된다(analyticsEvents.ts 화이트리스트).

## 5. 만료 확인

1. Vercel Cron(또는 수동 `npm run maintenance:daily`) 실행.
2. 지난 회차가 `/admin/showtimes`에서 비활성 + 만료 표시로 바뀌는지 확인.
3. 지난 회차가 추천에 다시 나오지 않는지( `/admin/runs` trace에 '만료된 회차' 사유) 확인.

## 6. 종료 조건 기록

| 항목 | 결과 |
|---|---|
| health ok + 009 적용 | ☐ |
| placeholder URL 등록 거부 | ☐ |
| 실제 회차 1건 등록·중복 거부 | ☐ |
| 추천에 verified 회차 노출 | ☐ |
| trace 재현 가능 | ☐ |
| 퍼널 이벤트 적재 | ☐ |
| 만료 처리 및 추천 제외 | ☐ |

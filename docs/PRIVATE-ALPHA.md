# 비공개 알파 게이트 — 초대 코드 + 참여 동의

- 기준일: 2026-07-29 (8차 마일스톤)
- `docs/ALPHA-PLAN.md`가 "보류"로 남겨둔 항목 중 "초대 코드/비공개 URL 구현"과 "실제
  참여자 관리"에 해당한다. 초대 코드 발급·홍보 자체는 여전히 사람이 결정할 일이고, 이
  문서가 다루는 것은 그 결정이 내려졌을 때 곧바로 켤 수 있는 코드다.

## 기본값: 꺼짐

`feature_flags`의 `private_alpha_gate` 키(`db/seed-feature-flags.mjs`에서 기본값 `0`으로
시드)가 꺼져 있으면 앱 전체가 7차 마일스톤 그대로 완전히 공개된 상태로 동작한다. 이번
마일스톤은 게이트 코드를 추가했을 뿐 기본 동작을 바꾸지 않았다 — 실제로 알파를 시작할
준비가 됐을 때 관리자가 `/admin/feature-flags`에서 켜는 스위치 하나로 전환한다.

## 데이터 모델 (`db/migrations{,-postgres}/006_private_alpha.sql`)

```sql
invite_codes(id, code, description, max_uses, use_count, expires_at, active,
             created_by, created_at)
invite_code_redemptions(id, invite_code_id, session_id, redeemed_at)
alpha_consents(id, session_id, consented_at)
```

- 초대 코드는 세션 단위로 소비된다(`invite_code_redemptions`) — 같은 세션이 같은 코드를
  다시 제출해도 사용 횟수가 중복 차감되지 않는다.
- 동의는 세션 단위로 기록된다(`alpha_consents`) — 코드와 별개다. 코드를 알아도 동의 화면의
  고지사항에 동의하기 전까지는 게이트를 통과하지 못한다.

## 게이트 로직 (`proxy.ts`)

Next.js 16부터 `middleware.ts`/`middleware()`가 `proxy.ts`/`proxy()`로 이름이 바뀌었고,
Proxy는 항상 Node.js 런타임에서 돈다(런타임을 고를 수 없다) — 그래서 DB 조회를 Proxy
안에서 직접 할 수 있다.

순서:

1. `feature_flags.private_alpha_gate`가 꺼져 있으면 즉시 통과.
2. 초대 쿠키(`cinefit_invited`, `src/lib/alphaAccess.ts`)가 없으면 `/alpha/invite`로
   리다이렉트(`?next=`에 원래 경로 보존).
3. 분석 세션 ID(`readAnalyticsSessionId`)로 `alpha_consents`를 조회해 동의 여부를 확인.
   동의가 없으면 `/alpha/consent`로 리다이렉트.
4. 둘 다 통과하면 원래 페이지를 그대로 보여준다.

`/api/*`, `/admin/*`, `/alpha/*`, 정적 자산은 matcher에서 제외돼 게이트의 영향을 받지
않는다 — 관리자 흐름과 초대/동의 API 자체가 게이트에 막히면 아무도 들어올 수 없기 때문.

### fail-open 설계

플래그 조회나 동의 조회가 실패하면(마이그레이션 전, DB 일시 장애 등) **게이트를 무력화하고
통과시킨다**(fail-closed로 사이트 전체를 막지 않는다). DB 하나가 삐끗했다고 알파 참여자
전원이 접근 불가능해지는 것보다, 그 순간만 게이트가 잠깐 뚫리는 쪽이 훨씬 안전한
선택이다 — 어차피 게이트는 기본으로 꺼져 있고, 켜져 있는 동안의 DB 장애는 드물게만
일어난다고 본다.

## 동의 화면 이후 하드 네비게이션을 쓰는 이유

`components/AlphaConsentForm.tsx`는 동의 처리 후 `router.push()`가 아니라
`window.location.href = next`로 이동한다.

진단 과정에서 발견한 문제: 동의 전 `/alpha/invite`나 `/alpha/consent`로 리다이렉트됐던
페이지 방문 기록이 Next.js의 클라이언트 사이드 라우터 캐시에 남아 있으면, 동의 직후
`router.push(next)` + `router.refresh()`로 이동해도 라우터가 그 캐시된 리다이렉트 응답을
재사용해 버려 서버(Proxy)에 새로 물어보지 않고 다시 `/alpha/invite`로 튕기는 경우가
있었다. 실제로는 동의가 정상 기록됐고 Proxy도 매 요청마다 올바르게 `consented=true`를
반환하고 있었다 — 문제는 순수하게 클라이언트 라우터 캐시 쪽이었다.

게이트 통과 여부처럼 보안에 민감한 판단이 걸린 네비게이션은 클라이언트 캐시를 신뢰하지
않고 항상 서버에 새로 확인하도록 하드 네비게이션을 쓴다.

## 분석 이벤트 동의 연동 (`src/analytics/serverAnalytics.ts`)

게이트가 켜져 있는 동안은 분석 이벤트 기록도 동의 여부를 따른다 —
`createServerAnalytics(getDb)`가 `createFeatureFlagRepository(getDb)`로 만든 리포지토리로
`private_alpha_gate`가 켜져 있는지 먼저 확인하고, 켜져 있다면 해당 세션이
`alpha_consents`에 없는 이벤트는 기록하지 않는다(전역 싱글턴이 아니라 주입된 `getDb`로
리포지토리를 만드는 이유는 테스트에서 주입한 DB와 일관되게 동작하게 하기 위해서다). 게이트가
꺼져 있으면 7차 마일스톤 그대로 동의와 무관하게 기록한다.

## 관리자 화면

- `/admin/invite-codes` — 코드 생성(비우면 자동 생성, `CODE_ALPHABET`에서 헷갈리기 쉬운
  문자 `0/O/1/I/L` 제외한 8자), 설명, 사용 한도, 만료일 지정, 활성/비활성 토글.
- `/admin/feature-flags` — `private_alpha_gate` 켜기/끄기(기존 기능 플래그 UI 재사용).

## 실제 알파를 시작할 때 할 일 (사람이 결정)

1. `/admin/invite-codes`에서 초대 코드 발급(테스터별로 나눌지, 공용 코드 하나로 할지는
   모집 방식에 따라 결정).
2. 테스터에게 코드와 `/alpha/invite` 링크(또는 앱 루트 URL) 전달.
3. 모집 규모가 준비되면 `/admin/feature-flags`에서 `private_alpha_gate` 켜기.
4. `docs/DATA-RETENTION.md`(삭제 요청 흐름)와 `docs/OPERATIONS.md`(운영 대시보드)가 이
   마일스톤의 다른 트랙(#36, #37)에서 이어서 완성된다 — 알파를 실제로 열기 전에 두 문서의
   해당 절이 완료됐는지 확인한다.

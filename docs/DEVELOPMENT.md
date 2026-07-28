# CineFit 개발 가이드 (첫 마일스톤 PWA)

## 로컬 실행

요구 사항: **Node.js 24 이상** (내장 `node:sqlite` 사용 — 별도 DB 설치 불필요), API 키 불필요.

```powershell
git clone https://github.com/cofldus/CineFit.git
cd CineFit
npm ci
npm run db:seed     # SQLite 생성·시드 (spikes/minimal-db/cinefit-spike.db)
npm run dev         # http://localhost:3000
```

프로덕션 모드: `npm run build` → `npm run start`

## 환경변수

앱 자체는 환경변수 없이 동작한다(관리자·동기화 기능 제외). 루트 `.env.example` 참고 —
키 이름만 커밋하고 실제 값은 `.env`(gitignore)에만 둔다.

| 변수 | 기본값 | 용도 |
|---|---|---|
| `CINEFIT_DB_PATH` | `spikes/minimal-db/cinefit-spike.db` | SQLite 파일 경로 재지정 (seed·migrate·앱·CLI 공통) |
| `KOBIS_API_KEY` | 없음 | `npm run sync:kobis` (앱 런타임 불필요) |
| `KMDB_API_KEY` | 없음 | KMDb 어댑터(승인 대기) |
| `ADMIN_PASSWORD` | 없음 | 관리자 화면·API — **미설정 시 /admin 전체 비활성** |
| `CINEFIT_CLOCK_MODE` | `system` | `demo`면 고정 시각 사용 |
| `CINEFIT_DEMO_NOW` | 2026-07-27T12:00+09:00 | demo 모드 기준 시각 |
| `CINEFIT_ALLOW_SYNTHETIC` | 미설정 | `true`면 검증 회차가 있어도 합성 회차 노출(개발·데모) |
| `CINEFIT_INSECURE_COOKIE` | 미설정 | `true`면 프로덕션 빌드에서도 Secure 쿠키 해제(로컬 E2E용) |

## DB 초기화·시드

```powershell
npm run db:seed   # 기존 DB 삭제 후 재생성 (멱등)
```

- 스키마: `spikes/minimal-db/schema.sql` (docs/06 데이터 설계의 SQLite 축소판, 핵심 11개 테이블)
- 시드: `spikes/minimal-db/seed.mjs` — 영화 3편·상영관 10개·회차 15개
- 시드 회차 날짜는 `2026-07-28` 고정이며 `src/data/constants.ts`의 `DEMO_DATE`와 동기

## 테스트

```powershell
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest — 엔진·검증·API 라우트 (db:seed 선행 필요)
npm run build       # 프로덕션 빌드
npx playwright install chromium   # 최초 1회
npm run test:e2e    # Playwright — build 선행 필요 (webServer가 npm run start 실행)
```

CI(GitHub Actions)는 push/PR마다 lint → typecheck → seed → unit → build를 게이트로 실행하고,
별도 잡에서 E2E를 돌린다. E2E가 CI에서 실패하면 `playwright-report` 아티팩트를 확인한다.
로컬에서만 재현할 때: `npm run build; npx playwright test --headed`.

## 구조와 추천 엔진

```
app/                # 화면·API 라우트 (Next.js App Router)
components/         # 프레젠테이션 컴포넌트 (TrustBadge·RecommendCard 등)
src/domain/         # 순수 도메인 — 추천 엔진 (DB·UI 비의존, now 주입)
src/data/           # 데이터 계층 — node:sqlite 리포지토리·서비스
src/lib/            # 검증(Zod)·지리 근사·표시 헬퍼
spikes/             # Phase 4 기술 검증 (스키마·시드·API 스파이크) — 앱이 스키마·시드 재사용
```

추천 파이프라인(`src/domain/recommendation/engine.ts`, 문서 05 축소 구현):

```
배급 버전 필터 → 하드 필터(운영상태·포맷 허용·이동·가격·멀미·휠체어, 점수 상쇄 금지)
→ 축 점수(포맷 적합·관 품질·회차 적합·이동·가격, 좌석/개인화는 중립 0.5)
→ 신뢰도(conf=0.5·min+0.5·mean)·최신성(반감기 감쇠) 곱셈 보정(0.6~1.0)
→ 브랜드 가산 차단(FFM<0.4 특별관은 설비 점수 절반 감점)
→ 다양성 선택(균형/품질/근접·가성비) → 설명 생성(장점·단점·불확실·출처 인용)
```

설명 문장은 점수 계산에 실제 사용된 특징량에서만 생성한다(문서 05 §7). UI는 엔진 결과를
그대로 렌더링하며 하드코딩된 추천이 없다.

## 합성 데이터 주의

- **회차·가격은 전부 검증용 합성 데이터**다(`sources.kind='spike_seed'`, 신뢰 가중치 0.3).
  화면에는 "≈ 검증용 합성 회차" 배지가 강제 표기되며, 실서비스 시드로 사용 금지.
- 상영관 사양은 문서 01 조사 사실을 `info_status`·`confidence`·출처와 함께 옮긴 것이다.
  미검증 항목(예: 천호 CoLa=사용자 제보)은 신뢰 보정으로 자동 감점된다.
- 검증 대기 항목 관리: `docs/90-verification-register.md`

## KOBIS 동기화 운영 (구현 완료)

```powershell
npm run sync:kobis -- --date=20260726                 # 일별 박스오피스 상위작 상세 동기화
npm run sync:kobis -- --movie-code=20236295,20226431  # 특정 영화
npm run sync:kobis -- --date=20260726 --dry-run       # 변경 예측만 (쓰기 없음)
```

- 흐름: KOBIS 응답 → 정규화(`kobisMapper`) → `external_observations` 불변 기록(해시·diff·최소
  원문 발췌) → `movies`/`movie_releases`/`movie_format_versions` 승격. 동일 해시 재수신은
  `unchanged`로 기록만 하고 승격을 건너뛴다. 동명 복수 후보는 `error`(수동 검수)로 보류.
- **showTypes 해석 원칙**: "KOBIS 등록 상영 형태" 사실만 저장한다. 화면비·Atmos·Vision 등
  기술 사양을 여기서 만들지 않는다 (docs/90 §3-1).
- `npm run db:seed`는 DB를 재생성하므로 이후 동기화를 다시 실행해야 한다.

## 관리자 회차 운영 절차

1. `/admin/login` → `ADMIN_PASSWORD`로 로그인 (8시간 세션).
2. 공식 예매 페이지에서 회차를 확인하고 `/admin/showtimes/new`에 등록 — 예매 딥링크·정보
   출처는 필수, "검증용 합성" 체크는 실제 회차가 아닐 때만.
3. 배급 버전에 없는 포맷은 근거(mismatchNote) 입력 시에만 저장된다(경고 유지).
   관 브랜드와 불가능한 포맷(일반관에 IMAX 등)은 저장 자체가 거부된다.
4. 수정·비활성화는 `/admin/showtimes/[id]` — **삭제는 없다.** 모든 변경은 이력에 남는다.
5. 관리자 확인(비합성) 회차가 있는 날짜는 사용자 추천에서 합성 회차가 자동 제외된다.

## 제보 검토 운영 절차

사용자 제보(`/cinemas/[id]/report`)는 접수만으로는 추천에 반영되지 않는다.
반영 규칙 전체는 **docs/DATA-PROMOTION-POLICY.md** — 요약:

1. `/admin/reports`에서 대기 제보 확인 → 상세에서 증빙·주장 값 검토.
2. 상태 전이(검토 중/추가 정보 필요/반려/중복)는 사유 메모와 함께. 반려·중복은 종결이다.
3. **관찰 기록 승인**: 사실만 관찰 로그(observations)에 남긴다 — 추천 미반영.
   신뢰도는 정책 상한(단일 0.55/증빙 0.65/복수 일치 0.75)으로 자동 캡, info_status는
   `user_report` 고정(official 승격 금지).
4. **좌석 존 승격**(좌석 구역 제보만): 기존 존을 덮어쓰지 않고 supersedes 계보로 대체 —
   이전 존은 is_active=0·valid_to 마감으로 남는다. promoted는 되돌릴 수 없다(새 승격으로 대체).
5. 모든 처리는 audit_logs에 남는다. 관련 코드: `src/data/reportPromotionService.ts`,
   `src/domain/trust/confidencePolicy.ts`, 테스트 `tests/api/adminReports.test.ts`.

## 좌석 존·상영관 상세

- `seat_zones`(마이그레이션 002): "명당"은 단일 좌표가 아니라 **목적별 구역**으로만 저장
  (immersive/overview/subtitle/sound/low_motion/neck_easy/…, docs/06 §3.2). 시드는
  `db/seed-seat-zones.mjs`(멱등, `db:seed` 체인에 포함) — 커뮤니티 통설(용아맥 J~L열,
  코돌비 H열)은 `user_report` 0.7, 나머지는 `estimated` 0.3으로 구분 기록.
- 추천 4.4축(SeatQuality): 원하는 목적(포맷+자막/목편함/멀미) 커버율 × 존 신뢰도로
  0.5~0.85 근사, 존 없으면 중립 0.5 + 불확실 표기. 좌석 제보 반감기 90일.
- 상영관 상세 `/cinemas/[id]`: 현재 사양·사양 이력·근거 관측 기록·좌석 구역·예정 회차.
  추천 카드의 상영관명에서 진입.

## 시계(Clock) 규칙

`new Date()` 직접 호출 대신 `src/lib/clock.ts`의 `getAppClock()`을 사용한다.
운영은 `system`, 데모·E2E는 `CINEFIT_CLOCK_MODE=demo`(+`CINEFIT_DEMO_NOW`), 테스트는
`fixedClock`/`now` 주입. 날짜 계산은 `seoulDateString()`으로 Asia/Seoul을 명시한다
(자정 경계·심야 회차 테스트: `tests/unit/clock.test.ts`).

## 배포 준비 메모 (자격증명 없이 준비된 범위)

- **SQLite의 서버리스 제약**: Vercel 등 서버리스 환경은 파일시스템이 임시적이라
  `node:sqlite` 파일 DB를 **영속 쓰기 저장소로 쓸 수 없다**(요청 간 유실). 현 구조 권장:
  개발·로컬·셀프호스트(단일 노드, 영속 볼륨)는 SQLite 유지, 운영 배포는 PostgreSQL
  (문서 08 ADR-3의 원안)로 이전. 리포지토리 계층(`src/data/*Repository.ts`)이 SQL 접점을
  모으고 있어 다음 마일스톤에서 드라이버 교체로 이전한다 — 지금 전체 마이그레이션은 하지 않음.
- 프로덕션 환경변수: `ADMIN_PASSWORD`(필수), `CINEFIT_DB_PATH`(영속 볼륨 경로),
  `KOBIS_API_KEY`(동기화 작업에만). `CINEFIT_ALLOW_SYNTHETIC`·`CINEFIT_INSECURE_COOKIE`는
  운영에서 설정 금지.
- 관리자 인증: 단일 비밀번호+HMAC 쿠키는 1인 운영 전제 — 다중 운영자·감사 추적이 필요해지면
  검증된 인증 라이브러리로 교체.
- PWA 캐시 갱신: `public/sw.js`의 `CACHE` 버전 문자열을 배포 시 변경하면 구 캐시가 정리된다.
- 외부 예매 링크: `target="_blank" rel="noopener noreferrer nofollow"` 적용됨.

## KMDb 어댑터 연결 지점 (키 승인 대기)

`src/data/adapters/kmdb/`를 KOBIS 어댑터와 같은 구조(client/schemas/mapper/syncService)로
추가한다. 식별자 연결은 `spikes/api-feasibility/link-identifiers.mjs`(제목+감독+연도) 전략을
`kobisSyncService.findExistingMovie`처럼 서비스로 승격하고, 결과는 `movies.kmdb_docid`에
저장, 관찰은 동일하게 `external_observations`(provider='kmdb')를 거친다.
키 발급 시 약관을 docs/90 항목 4에 인용할 것.

## 서비스워커 최소화 이유

오프라인에서는 앱 셸(`/offline` 안내)만 제공한다. 추천 결과·사양 데이터는 확인일·신선도가
핵심 가치라 오래된 캐시를 보여주는 것이 서비스 원칙(문서 09 §1 "신뢰가 보이는 UI")과
충돌하기 때문에 데이터 캐싱을 의도적으로 하지 않는다.

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

앱 자체는 환경변수 없이 동작한다. 선택 사항:

| 변수 | 기본값 | 용도 |
|---|---|---|
| `CINEFIT_DB_PATH` | `spikes/minimal-db/cinefit-spike.db` | SQLite 파일 경로 재지정 |

KOBIS·KMDb API 키는 **앱이 아니라** `spikes/api-feasibility/.env`에서만 사용한다
(`.env.example` 참고 — 키 이름만 커밋, 실제 키는 절대 커밋 금지).

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

## KOBIS·KMDb 어댑터 연결 지점 (다음 마일스톤)

외부 API와 앱 DB는 분리되어 있다. 연결 시 만들 것:

1. `src/data/adapters/kobisAdapter.ts` — 영화 목록·상세 동기화.
   `movies`(kobis_code 채움)·`movie_releases`·`movie_technical_specs`의 `format_versions`를
   KOBIS `showTypes`(IMAX/4D/ScreenX/DOLBYCINEMA 구조화 확인, 2026-07-27 실호출 검증)로 대체.
   호출 코드는 `spikes/api-feasibility/kobis-*.mjs` 참조.
2. `src/data/adapters/kmdbAdapter.ts` — 한국영화 메타·기술 필드 보강.
   식별자 연결 전략은 `spikes/api-feasibility/link-identifiers.mjs`(제목+감독+연도) 참조,
   결과는 `movies.kmdb_docid`에 저장.
3. 동기화는 `observations` 불변 로그를 거쳐 대표값 승격(문서 06 §1) — 리포지토리 직접 UPDATE 금지.

키는 앱 루트 `.env`(신설 시 `.env.example`에 키 이름만)로 주입하고, 어댑터가 없어도
앱은 시드 DB만으로 동작해야 한다(현재 상태 유지).

## 서비스워커 최소화 이유

오프라인에서는 앱 셸(`/offline` 안내)만 제공한다. 추천 결과·사양 데이터는 확인일·신선도가
핵심 가치라 오래된 캐시를 보여주는 것이 서비스 원칙(문서 09 §1 "신뢰가 보이는 UI")과
충돌하기 때문에 데이터 캐싱을 의도적으로 하지 않는다.

# 문서 8. 시스템 아키텍처

- 조사 기준일: 2026-07-27 | 서비스: CineFit(시네핏)

## 1. 후보 비교와 최종안

### 클라이언트
| 후보 | 평가 |
|---|---|
| **반응형 웹·PWA (선정)** | MVP 속도 최고, 스토어 심사 불필요, 딥링크·지도 무리 없음. 푸시는 웹푸시(iOS 16.4+ 지원) |
| React Native/Expo | 4단계(모바일 앱)에서 채택 예정 — 웹과 TS·로직 공유 |
| Flutter | 팀 TS 역량 가정 시 이중 언어 비용 |
| 네이티브 | MVP에 과투자 |

### 프론트/백엔드
- **Next.js 15 + TypeScript + Tailwind + Radix UI(접근성 검증 컴포넌트)** — `@cinefit/web`, `@cinefit/admin`.
- 백엔드: **NestJS(Node/TS)** `@cinefit/api` — 추천 엔진(`@cinefit/recommender`)을 동일 언어 라이브러리로 공유.
  FastAPI 대비: 언어 통일·타입 공유 이점 우선. Supabase/Firebase는 이력 모델·복잡 쿼리 제약으로 코어 DB로는 배제(인증은 Supabase Auth 옵션 검토 가능).

### 저장소·검색
- **PostgreSQL 16 + PostGIS**(공간 질의: 반경 내 상영관), **Redis**(추천 캐시·레이트리밋·잡 큐), 객체 저장소(제보 사진·스냅샷).
- 검색 엔진 비교: 데이터 규모가 작음(영화 수천, 관 수백, 회차 수만/주) →
  | 후보 | 판단 |
  |---|---|
  | **PostgreSQL FTS + pg_trgm (MVP 선정)** | 규모상 충분, 운영물 1개 감소. 한국어는 형태소 대신 trgm+별칭 테이블로 커버 |
  | Meilisearch (베타 승격 후보) | 오타 허용·즉시성 우수, 운영 단순 — 검색 UX 병목 확인 시 도입 |
  | Typesense / OpenSearch | OpenSearch는 nori 형태소 강점이나 현 규모에 과함 |

### 비동기 작업
- **BullMQ(Redis)**: 수집 배치, 뉴스 모니터링, 캐시 무효화, 알림. 재시도·중복 방지 잡 키. 관리자 승인 워크플로는 DB 상태 머신(문서 6).

### 인프라
| 후보 | 판단 |
|---|---|
| **Vercel(web) + 컨테이너 1대(api+worker, AWS Lightsail/ECS 또는 GCP Cloud Run) + Neon/RDS Postgres + Upstash Redis (MVP 선정)** | 월 ~$50–150 수준, 운영 난이도 최저. 국내 지연은 Vercel edge+서울 리전(ap-northeast-2) DB로 대응 |
| 전면 AWS(EKS 등) | 확장기 이전 과투자 |
| Cloudflare | CDN·봇 방어로 병행 사용 |

## 2. 아키텍처 다이어그램

```mermaid
flowchart LR
    subgraph Client
      W["@cinefit/web (Next.js PWA)"]
      ADM["@cinefit/admin"]
    end
    subgraph Server
      API["@cinefit/api (NestJS)"]
      REC["@cinefit/recommender (lib)"]
      WK[Worker: BullMQ jobs]
    end
    subgraph Data
      PG[(PostgreSQL+PostGIS)]
      RD[(Redis)]
      OBJ[(Object Storage)]
    end
    EXT1[KOBIS/KMDb/TMDB API]
    EXT2[카카오·TMAP 지도/경로 API]
    EXT3[공식 예매 페이지 딥링크]
    W --> API --> REC
    ADM --> API
    API --> PG & RD
    WK --> PG & RD & OBJ
    WK --> EXT1
    API --> EXT2
    W -. 이동 .-> EXT3
```

## 3. API 구조 (요약)

```
GET  /movies?query=            # 별칭·오탈자 포함 검색
GET  /movies/:id               # 사양+정보상태 배지 포함
POST /recommendations          # RecommendationRequest → 결과 3종+부가답변
GET  /auditoriums/:id          # 사양·이력·좌석존
GET  /auditoriums/:id/seats?purpose=
POST /reports                  # 제보(사실형/주관형)
GET  /admin/queue, POST /admin/observations/:id/verify ...
인증: 이메일+OAuth(카카오·구글), JWT(수명 짧게)+refresh. 관리자 RBAC.
속도 제한: IP·계정별(Redis). 입력 검증: zod 스키마 공유(@cinefit/ui와 동일 타입).
```

## 4. 관측 가능성

- 오류: Sentry. 로그: 구조화 JSON(pino) → 수집기.
- 핵심 메트릭: 추천 p95 지연, 검색 실패율(결과 0), 파서 실패율, 데이터 신선도(30일 내 확인 비율),
  딥링크 404율, 외부 API 비용/쿼터 소진, 퍼널 이탈(추천→카드 확장→딥링크).

## 5. ADR (핵심 결정 기록)

**ADR-1. 회차를 추천의 1급 엔티티로 한다** — 상태: 채택.
맥락: "IMAX관 보유 ≠ IMAX 회차"(문서 1 §3). 결정: showtime_presentations 분리. 결과: 수동 입력 비용 증가를 감수.

**ADR-2. 상영시간표는 MVP에서 수동 입력 + 딥링크** — 상태: 채택.
맥락: 공개 API 부재, 크롤링 민사 리스크(잡코리아 판례), CGV·메가박스 봇 차단. 결정: 자동 수집 포기,
KOFIC 개방 문의·제휴 병행. 결과: 커버리지가 관리자 처리량에 종속 → MVP 범위 50~100관으로 제한.

**ADR-3. PostgreSQL 단일 저장소 + 이력 모델** — 상태: 채택.
맥락: 사양 변경·리뉴얼 추적이 제품 핵심. 결정: observations(불변) + valid_from/to 사양 이력,
검색도 MVP는 PG 내장. 결과: 별도 검색엔진 도입은 지표 기반으로 연기.

**ADR-4. LLM은 파싱·문장 정리만, 사실은 DB만** — 상태: 채택.
맥락: 사실성 요구(§26). 결정: 설명의 사실 문장은 observation 인용 필수, 미인용 문장 제거. 결과: 문서 11 §2로 회귀 검증.

**ADR-5. 추천 엔진과 수익 시스템 분리** — 상태: 채택.
결정: recommender는 광고·제휴 데이터에 접근 불가(패키지 경계), 제휴 표시는 프레젠테이션 레이어에서만.

## 6. 비용 추정(월, MVP)

Vercel Pro $20 + 컨테이너 $20–40 + Neon/RDS $19–50 + Upstash $10 + Sentry $0–26 + 지도 API(무료 쿼터 내)
≈ **$70–150/월**. 확장 시 주요 증가 요인: 지도 경로 호출량, DB IOPS, 검색엔진 추가.

## 7. 확장 계획

베타→정식: ① Meilisearch 도입(검색 지표 악화 시) ② worker 분리 스케일아웃 ③ 읽기 복제본
④ RN 앱 추가(`@cinefit/mobile`) ⑤ 제휴 피드 수신용 인제스천 서비스 ⑥ 전국 확대 시 지역 파티셔닝은 불필요(규모 작음), CDN 캐시 강화로 충분.

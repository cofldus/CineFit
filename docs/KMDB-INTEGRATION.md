# KMDb(한국영상자료원) 연동

- 기준일: 2026-07-29 (8차 마일스톤)
- KMDb API 키는 2026-07-28 발급 완료(`docs/ALPHA-PLAN.md`). 이 문서가 다루는 것은 이번에
  새로 만든 정식 어댑터(`src/data/adapters/kmdb/`)이지, 식별자 연결(어느 KOBIS 영화가 어느
  KMDb 문서인지 결정하는 일)은 아니다 — 그건 `docs/IDENTIFIER-LINKAGE.md`.

## 원칙 — 검증되지 않은 것은 만들지 않는다

- `spikes/api-feasibility/kmdb-movie.mjs` 실호출 스파이크에서 **실제로 확인된 필드만**
  스키마(`kmdbSchemas.ts`)에 넣었다. 사용자 지시서가 "키워드" 수집을 언급했지만, 스파이크
  응답에서 그 필드의 정확한 이름을 검증하지 못해 **의도적으로 뺐다** — 그럴듯한 이름을
  추측해 넣지 않는다.
- KMDb의 `screenArea`/`soundEcho`/`fSound` 필드는 원문 그대로만 옮긴다. 이 값들을 우리
  큐레이션 vocabulary(`native_ar`, `atmos_mix` 등)로 해석·환산하지 않는다 — KMDb의 필드
  의미를 검증 없이 우리 스펙 체계에 대응시키는 것 자체가 또 다른 추정이기 때문이다.

## 데이터 흐름

```
KMDb 검색 API → kmdbSchemas(zod 검증) → kmdbMapper(정규화) → kmdbSyncService
  → external_observations(불변 로그, provider='kmdb')
  → movie_technical_specs(spec_key='kmdb_screen_area'|'kmdb_sound_echo'|'kmdb_f_sound',
                          source_id=KMDb, info_status='single_unverified', confidence=0.4)
  → observations(entity_type='movie', field='plot_summary')
```

- KOBIS 어댑터(`src/data/adapters/kobis/`)와 동일한 구조: `*Types.ts`(타입) →
  `*Schemas.ts`(zod 검증) → `*Client.ts`(HTTP, 타임아웃·재시도·호출 간격) →
  `*Mapper.ts`(정규화) → `*SyncService.ts`(관찰 로그 → 승격).
- **KMDb 전용 source_id로만 upsert한다** — 다른 출처(KOBIS 등)의 `movie_technical_specs`
  행은 절대 건드리지 않는다(`UNIQUE(movie_id, spec_key, source_id)`로 자연히 분리된다). 이
  덕분에 "다른 출처와 충돌하면 어떻게 할지" 같은 별도 판단 로직이 필요 없다 —애초에 같은
  spec_key라도 source_id가 다르면 다른 행이다.
- `info_status`를 항상 `single_unverified`로 남긴다(KMDb 단독, 교차검증 안 됨) — 화면에서
  공식 확정값(`official`)과 자동으로 구분된다. 관리자가 검토 후 큐레이션 vocabulary로
  승격할지는 사람이 판단한다(이번 마일스톤에서는 그 승격 UI까지 만들지 않았다).

## 사용법

```bash
# 1) 먼저 식별자 연결이 있어야 한다 (docs/IDENTIFIER-LINKAGE.md)
npm run sync:movie-identifiers -- --dry-run

# 2) 연결된 영화의 KMDb 데이터 동기화
npm run sync:kmdb -- --movie-id=5
npm run sync:kmdb -- --movie-id=5,7,12 --dry-run
```

`KMDB_API_KEY`가 `.env`에 없으면 CLI가 즉시 종료한다. 실제 외부 호출은 기본 CI 게이트에
포함하지 않는다(`docs/OPERATIONS.md`) — 테스트는 전부 fixture·mock fetch 기반이다
(`tests/unit/kmdb.test.ts`, `tests/integration/kmdbSync.test.ts`).

## 소스 신뢰 가중치

`sources.trust_weight`를 KOBIS(1.0)보다 보수적인 **0.9**로 설정했다 — KMDb 자체는 공식
기관(한국영상자료원)이지만, 이번이 첫 연동이라 기술 필드(`screenArea` 등)의 실제 정확도를
아직 교차검증하지 않았기 때문이다. 실사용 데이터가 쌓여 신뢰도가 확인되면 조정할 수 있다.

// SQLite → PostgreSQL 데이터 이전 도구.
// 사용: npm run db:import-sqlite [-- --source=path/to.db] [--dry-run]
//  - 전체 단일 트랜잭션 (실패 시 롤백, dry-run은 끝에서 강제 롤백)
//  - 자연키 기반 중복 제거 → 재실행해도 중복 생성 없음
//  - FK 순서 처리 + id 재매핑, 합성 상태·출처·확신도·확인일·이력 보존
//  - 실패 로그에 사용자 입력 본문·비밀값을 출력하지 않는다 (테이블·키만)
import { fileURLToPath } from 'node:url';
import { createPostgresClient } from '../src/data/client/postgresClient.ts';
import { createSqliteClient } from '../src/data/client/sqliteClient.ts';
import type { DbClient } from '../src/data/client/types.ts';

type Row = Record<string, unknown>;
export interface Counts {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ImportOptions {
  sourcePath: string;
  pgUrl: string;
  dryRun?: boolean;
}

export interface ImportResult {
  dryRun: boolean;
  summary: Map<string, Counts>;
}

class DryRunRollback extends Error {}

const norm = (s: unknown) => String(s ?? '').replace(/[\s:·,\-–—!?.]/g, '').toLowerCase();

async function findId(tx: DbClient, sql: string, params: unknown[]): Promise<number | null> {
  const rows = await tx.query<{ id: number }>(sql, params);
  return rows[0]?.id ?? null;
}

async function insertRow(tx: DbClient, table: string, row: Record<string, unknown>): Promise<number> {
  const cols = Object.keys(row);
  const rows = await tx.query<{ id: number }>(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')}) RETURNING id`,
    cols.map((c) => row[c]),
  );
  return rows[0].id;
}

export async function importSqliteToPostgres(opts: ImportOptions): Promise<ImportResult> {
  const { sourcePath, pgUrl, dryRun = false } = opts;
  const summary = new Map<string, Counts>();
  const bump = (table: string, key: keyof Counts) => {
    const c = summary.get(table) ?? { created: 0, updated: 0, skipped: 0, failed: 0 };
    c[key]++;
    summary.set(table, c);
  };

  const src = createSqliteClient(sourcePath);
  const pg = createPostgresClient(pgUrl);
  const all = (table: string) => src.query<Row>(`SELECT * FROM ${table} ORDER BY id`);

  // id 재매핑 테이블 (구 SQLite id → 신 PG id)
  const sourceMap = new Map<number, number>();
  const movieMap = new Map<number, number>();
  const locationMap = new Map<number, number>();
  const audMap = new Map<number, number>();
  const showtimeMap = new Map<number, number>();

  const mapId = (m: Map<number, number>, id: unknown): number | null =>
    id === null || id === undefined ? null : (m.get(Number(id)) ?? null);

  try {
    await pg.transaction(async (tx) => {
      // 1. sources — 자연키: name
      for (const r of await all('sources')) {
        const existing = await findId(tx, `SELECT id FROM sources WHERE name = ?`, [r.name]);
        if (existing) {
          sourceMap.set(Number(r.id), existing);
          bump('sources', 'skipped');
        } else {
          const id = await insertRow(tx, 'sources', {
            kind: r.kind, name: r.name, url: r.url, terms_note: r.terms_note,
            allowed_use: r.allowed_use, trust_weight: r.trust_weight,
          });
          sourceMap.set(Number(r.id), id);
          bump('sources', 'created');
        }
      }

      // 2. movies — 자연키: kobis_code 우선, 없으면 정규화 제목
      const pgMovies = await tx.query<Row>(`SELECT id, title, kobis_code FROM movies`);
      for (const r of await all('movies')) {
        const byCode = r.kobis_code
          ? pgMovies.find((m) => m.kobis_code === r.kobis_code)
          : pgMovies.find((m) => !m.kobis_code && norm(m.title) === norm(r.title));
        const cols = {
          title: r.title, original_title: r.original_title, runtime_min: r.runtime_min,
          rating: r.rating, genres: r.genres, director: r.director,
          kobis_code: r.kobis_code, kmdb_docid: r.kmdb_docid, created_at: r.created_at,
        };
        if (byCode) {
          movieMap.set(Number(r.id), Number(byCode.id));
          await tx.run(
            `UPDATE movies SET title=?, original_title=?, runtime_min=?, rating=?, genres=?, director=?, kmdb_docid=? WHERE id=?`,
            [r.title, r.original_title, r.runtime_min, r.rating, r.genres, r.director, r.kmdb_docid, byCode.id],
          );
          bump('movies', 'updated');
        } else {
          movieMap.set(Number(r.id), await insertRow(tx, 'movies', cols));
          bump('movies', 'created');
        }
      }

      // 3. movie_releases — UNIQUE(movie_id,country,release_date) upsert
      for (const r of await all('movie_releases')) {
        const res = await tx.run(
          `INSERT INTO movie_releases (movie_id, country, status, release_date, source_id, info_status, observed_at, confidence)
           VALUES (?,?,?,?,?,?,?,?)
           ON CONFLICT (movie_id, country, release_date) DO NOTHING`,
          [mapId(movieMap, r.movie_id), r.country, r.status, r.release_date,
           mapId(sourceMap, r.source_id), r.info_status, r.observed_at, r.confidence],
        );
        bump('movie_releases', res.changes ? 'created' : 'skipped');
      }

      // 4. movie_technical_specs — UNIQUE(movie_id,spec_key,source_id)
      for (const r of await all('movie_technical_specs')) {
        const res = await tx.run(
          `INSERT INTO movie_technical_specs (movie_id, spec_key, value, source_id, info_status, observed_at, verified_at, confidence)
           VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (movie_id, spec_key, source_id) DO NOTHING`,
          [mapId(movieMap, r.movie_id), r.spec_key, r.value, mapId(sourceMap, r.source_id),
           r.info_status, r.observed_at, r.verified_at, r.confidence],
        );
        bump('movie_technical_specs', res.changes ? 'created' : 'skipped');
      }

      // 5. movie_format_versions — UNIQUE(movie_id,source_name,raw_value)
      for (const r of await all('movie_format_versions')) {
        const res = await tx.run(
          `INSERT INTO movie_format_versions (movie_id, raw_value, normalized_value, source_type, source_name, info_status, observed_at, verified_at)
           VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (movie_id, source_name, raw_value) DO NOTHING`,
          [mapId(movieMap, r.movie_id), r.raw_value, r.normalized_value, r.source_type,
           r.source_name, r.info_status, r.observed_at, r.verified_at],
        );
        bump('movie_format_versions', res.changes ? 'created' : 'skipped');
      }

      // 6. cinema_locations — 자연키: name
      for (const r of await all('cinema_locations')) {
        const existing = await findId(tx, `SELECT id FROM cinema_locations WHERE name = ?`, [r.name]);
        if (existing) {
          locationMap.set(Number(r.id), existing);
          bump('cinema_locations', 'skipped');
        } else {
          locationMap.set(
            Number(r.id),
            await insertRow(tx, 'cinema_locations', {
              chain: r.chain, name: r.name, address: r.address, lat: r.lat, lng: r.lng,
              region_code: r.region_code, status: r.status, transit_note: r.transit_note,
            }),
          );
          bump('cinema_locations', 'created');
        }
      }

      // 7. auditoriums — UNIQUE(location_id,auditorium_no)
      for (const r of await all('auditoriums')) {
        const locId = mapId(locationMap, r.location_id);
        const existing = await findId(
          tx, `SELECT id FROM auditoriums WHERE location_id = ? AND auditorium_no = ?`, [locId, r.auditorium_no],
        );
        if (existing) {
          audMap.set(Number(r.id), existing);
          bump('auditoriums', 'skipped');
        } else {
          audMap.set(
            Number(r.id),
            await insertRow(tx, 'auditoriums', {
              location_id: locId, auditorium_no: r.auditorium_no, brand: r.brand,
              status: r.status, seat_count: r.seat_count,
            }),
          );
          bump('auditoriums', 'created');
        }
      }

      // 8. auditorium_specs — 자연키: (auditorium_id, valid_from) — 이력 보존, 덮어쓰지 않음
      for (const r of await all('auditorium_specs')) {
        const audId = mapId(audMap, r.auditorium_id);
        const existing = await findId(
          tx, `SELECT id FROM auditorium_specs WHERE auditorium_id = ? AND valid_from = ?`, [audId, r.valid_from],
        );
        if (existing) {
          bump('auditorium_specs', 'skipped');
          continue;
        }
        await insertRow(tx, 'auditorium_specs', {
          auditorium_id: audId, valid_from: r.valid_from, valid_to: r.valid_to,
          projector: r.projector, screen: r.screen, sound: r.sound, supported_ar: r.supported_ar,
          masking: r.masking, notes: r.notes, renewal_event: r.renewal_event,
          source_id: mapId(sourceMap, r.source_id), info_status: r.info_status,
          observed_at: r.observed_at, verified_at: r.verified_at, confidence: r.confidence,
        });
        bump('auditorium_specs', 'created');
      }

      // 9. seat_zones — 자연키: (auditorium_id, purpose, row_range) — 목적 배열 JSON 보존
      for (const r of await all('seat_zones')) {
        const audId = mapId(audMap, r.auditorium_id);
        const existing = await findId(
          tx, `SELECT id FROM seat_zones WHERE auditorium_id = ? AND purpose = ? AND COALESCE(row_range,'') = COALESCE(?,'')`,
          [audId, r.purpose, r.row_range],
        );
        if (existing) {
          bump('seat_zones', 'skipped');
          continue;
        }
        await insertRow(tx, 'seat_zones', {
          auditorium_id: audId, purpose: r.purpose, row_range: r.row_range, col_range: r.col_range,
          rationale: r.rationale, source_id: mapId(sourceMap, r.source_id),
          info_status: r.info_status, observed_at: r.observed_at, confidence: r.confidence,
        });
        bump('seat_zones', 'created');
      }

      // 10. showtimes — 자연키: (auditorium_id, starts_at, movie_id) — 합성 상태·검증 정보 보존
      for (const r of await all('showtimes')) {
        const audId = mapId(audMap, r.auditorium_id);
        const movId = mapId(movieMap, r.movie_id);
        const existing = await findId(
          tx, `SELECT id FROM showtimes WHERE auditorium_id = ? AND starts_at = ? AND movie_id = ?`,
          [audId, r.starts_at, movId],
        );
        if (existing) {
          showtimeMap.set(Number(r.id), existing);
          bump('showtimes', 'skipped');
          continue;
        }
        const id = await insertRow(tx, 'showtimes', {
          movie_id: movId, auditorium_id: audId, starts_at: r.starts_at, ends_at_est: r.ends_at_est,
          format: r.format, is_3d: r.is_3d, language: r.language, price_adult: r.price_adult,
          booking_url: r.booking_url, entry_method: r.entry_method, data_checked_at: r.data_checked_at,
          source_id: mapId(sourceMap, r.source_id), info_status: r.info_status,
          status: r.status, is_synthetic: r.is_synthetic, admin_note: r.admin_note,
          verified_at: r.verified_at, format_mismatch_note: r.format_mismatch_note,
        });
        showtimeMap.set(Number(r.id), id);
        bump('showtimes', 'created');
      }

      // 11. showtime_changes — 이력 보존, (showtime_id, action, created_at) 중복 제거
      for (const r of await all('showtime_changes')) {
        const stId = mapId(showtimeMap, r.showtime_id);
        if (!stId) {
          bump('showtime_changes', 'skipped');
          continue;
        }
        const existing = await findId(
          tx, `SELECT id FROM showtime_changes WHERE showtime_id = ? AND action = ? AND created_at = ?`,
          [stId, r.action, r.created_at],
        );
        if (existing) {
          bump('showtime_changes', 'skipped');
          continue;
        }
        await insertRow(tx, 'showtime_changes', {
          showtime_id: stId, actor: r.actor, action: r.action, changes: r.changes, created_at: r.created_at,
        });
        bump('showtime_changes', 'created');
      }

      // 12. observations — entity_id 재매핑(auditorium), (entity, field, observed_at, source) 중복 제거
      for (const r of await all('observations')) {
        const entityId = r.entity_type === 'auditorium' ? mapId(audMap, r.entity_id)
          : r.entity_type === 'movie' ? mapId(movieMap, r.entity_id)
          : Number(r.entity_id);
        if (entityId === null) {
          bump('observations', 'skipped');
          continue;
        }
        const existing = await findId(
          tx, `SELECT id FROM observations WHERE entity_type=? AND entity_id=? AND field=? AND observed_at=? AND source_id=?`,
          [r.entity_type, entityId, r.field, r.observed_at, mapId(sourceMap, r.source_id)],
        );
        if (existing) {
          bump('observations', 'skipped');
          continue;
        }
        await insertRow(tx, 'observations', {
          entity_type: r.entity_type, entity_id: entityId, field: r.field, value: r.value,
          source_id: mapId(sourceMap, r.source_id), observed_at: r.observed_at,
          info_status: r.info_status, confidence: r.confidence,
        });
        bump('observations', 'created');
      }

      // 13. external_observations — (provider, external_id, data_hash, fetched_at) 중복 제거
      for (const r of await all('external_observations')) {
        const existing = await findId(
          tx, `SELECT id FROM external_observations WHERE provider=? AND external_id=? AND data_hash=? AND fetched_at=?`,
          [r.provider, r.external_id, r.data_hash, r.fetched_at],
        );
        if (existing) {
          bump('external_observations', 'skipped');
          continue;
        }
        await insertRow(tx, 'external_observations', {
          provider: r.provider, external_id: r.external_id, entity_hint: r.entity_hint,
          fetched_at: r.fetched_at, data_hash: r.data_hash, normalized: r.normalized,
          raw_excerpt: r.raw_excerpt, status: r.status, promoted_at: r.promoted_at,
          error: r.error, diff: r.diff, created_at: r.created_at,
        });
        bump('external_observations', 'created');
      }

      // 14. user_preferences — UNIQUE(user_id)
      for (const r of await all('user_preferences')) {
        const res = await tx.run(
          `INSERT INTO user_preferences (user_id, explicit, sensitivity, accessibility, updated_at)
           VALUES (?,?,?,?,?) ON CONFLICT (user_id) DO NOTHING`,
          [r.user_id, r.explicit, r.sensitivity, r.accessibility, r.updated_at],
        );
        bump('user_preferences', res.changes ? 'created' : 'skipped');
      }

      // 15. movie_aliases — 자연키: (movie_id, alias)
      for (const r of await all('movie_aliases')) {
        const movId = mapId(movieMap, r.movie_id);
        if (!movId) { bump('movie_aliases', 'skipped'); continue; }
        const existing = await findId(tx, `SELECT id FROM movie_aliases WHERE movie_id=? AND alias=?`, [movId, r.alias]);
        if (existing) { bump('movie_aliases', 'skipped'); continue; }
        await insertRow(tx, 'movie_aliases', { movie_id: movId, alias: r.alias });
        bump('movie_aliases', 'created');
      }

      // 16. auditorium_aliases — 자연키: (auditorium_id, alias)
      for (const r of await all('auditorium_aliases')) {
        const audId = mapId(audMap, r.auditorium_id);
        if (!audId) { bump('auditorium_aliases', 'skipped'); continue; }
        const existing = await findId(tx, `SELECT id FROM auditorium_aliases WHERE auditorium_id=? AND alias=?`, [audId, r.alias]);
        if (existing) { bump('auditorium_aliases', 'skipped'); continue; }
        await insertRow(tx, 'auditorium_aliases', { auditorium_id: audId, alias: r.alias });
        bump('auditorium_aliases', 'created');
      }

      // 17. feature_flags — key가 자연키(PK, id 컬럼 없음) — 운영에 이미 있는 값을 덮어쓰지
      // 않는다(운영자가 이미 켜고 끈 상태가 개발용 시드 값보다 우선한다).
      for (const r of await src.query<Row>(`SELECT * FROM feature_flags ORDER BY key`)) {
        const res = await tx.run(
          `INSERT INTO feature_flags (key, enabled, description, updated_at, updated_by)
           VALUES (?,?,?,?,?) ON CONFLICT (key) DO NOTHING`,
          [r.key, r.enabled, r.description, r.updated_at, r.updated_by],
        );
        bump('feature_flags', res.changes ? 'created' : 'skipped');
      }

      // issue_reports·audit_logs는 의도적으로 이전하지 않는다 — 개발·테스트 중 남긴 제보·
      // 감사 로그를 운영 DB의 실제 이력처럼 보이게 섞는 것이 오히려 데이터 무결성 문제다.
      // 운영은 빈 제보 큐·빈 감사 로그로 시작한다(docs/DATABASE.md).

      // 18. recommendation_runs — 과거 실행 기록 보존, (user_id, created_at, request) 중복 제거
      for (const r of await all('recommendation_runs')) {
        const existing = await findId(
          tx, `SELECT id FROM recommendation_runs WHERE COALESCE(user_id,'')=COALESCE(?,'') AND COALESCE(created_at,'')=COALESCE(?,'') AND request=?`,
          [r.user_id, r.created_at, r.request],
        );
        if (existing) {
          bump('recommendation_runs', 'skipped');
          continue;
        }
        await insertRow(tx, 'recommendation_runs', {
          user_id: r.user_id, request: r.request, weights: r.weights, results: r.results,
          latency_ms: r.latency_ms, created_at: r.created_at,
        });
        bump('recommendation_runs', 'created');
      }

      if (dryRun) throw new DryRunRollback();
    });
  } catch (e) {
    if (!(e instanceof DryRunRollback)) {
      await src.close();
      await pg.close();
      throw new Error(`import 실패(전체 롤백됨): ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }
  }

  await src.close();
  await pg.close();
  return { dryRun, summary };
}

export function formatImportSummary(result: ImportResult, sourcePath: string): string {
  const lines = [`${result.dryRun ? '[dry-run — 전체 롤백됨] ' : ''}SQLite → PostgreSQL import 결과 (${sourcePath}):`];
  for (const [table, c] of result.summary) {
    lines.push(`  ${table.padEnd(24)} 신규 ${c.created} / 갱신 ${c.updated} / 건너뜀 ${c.skipped} / 실패 ${c.failed}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sourceArg = args.find((a) => a.startsWith('--source='))?.slice(9);
  const sourcePath = sourceArg ?? 'spikes/minimal-db/cinefit-spike.db';
  const pgUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('DATABASE_URL(또는 DATABASE_DIRECT_URL)이 필요합니다. npm run pg:up 후 .env를 설정하세요.');
    process.exit(1);
  }
  const result = await importSqliteToPostgres({ sourcePath, pgUrl, dryRun });
  console.log(`\n${formatImportSummary(result, sourcePath)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}

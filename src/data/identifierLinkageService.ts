// KOBIS 영화 ↔ KMDb 문서 식별자 연결 — exact/high_confidence 유일 후보만 자동 연결하고,
// 나머지는 관리자 검토(/admin/data-linkage)로 남긴다. 승인·거절·연결 해제는 전부 audit_logs에
// 남는다(target_type='movie_identifier_link').
import { KmdbClient } from './adapters/kmdb/kmdbClient.ts';
import { mapSearchCandidates } from './adapters/kmdb/kmdbMapper.ts';
import { getAppDbClient } from './client/index.ts';
import type { DbClient } from './client/types.ts';
import { decideLinkage, evaluateCandidate } from '../domain/identifierLinkage/matcher.ts';
import type { MatchTier, RankedCandidate } from '../domain/identifierLinkage/matcher.ts';

export interface LinkageOptions {
  dryRun?: boolean;
  reviewOnly?: boolean; // true면 등급이 exact/high_confidence여도 자동 연결하지 않고 검토만 남긴다
  now?: () => Date;
  log?: (message: string) => void;
  db?: DbClient;
}

export type LinkageOutcome =
  | { ok: true; movieId: number; overallTier: MatchTier; autoLinked: boolean; candidateCount: number }
  | { ok: false; error: string };

async function getMovieYear(db: DbClient, movieId: number): Promise<number | null> {
  const rows = await db.query<{ d: string | null }>(
    `SELECT MIN(release_date) AS d FROM movie_releases WHERE movie_id = ?`,
    [movieId],
  );
  return rows[0]?.d ? Number(rows[0].d.slice(0, 4)) : null;
}

/** 아직 KMDb 미연결인 영화 하나에 대해 KMDb를 검색하고 매칭 결과를 기록한다. */
export async function linkMovie(
  client: KmdbClient,
  movieId: number,
  opts: LinkageOptions = {},
): Promise<LinkageOutcome> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const log = opts.log ?? (() => {});

  const movie = (
    await db.query<{ id: number; title: string; original_title: string | null; director: string | null; kmdb_docid: string | null }>(
      `SELECT id, title, original_title, director, kmdb_docid FROM movies WHERE id = ?`,
      [movieId],
    )
  )[0];
  if (!movie) return { ok: false, error: '존재하지 않는 영화입니다.' };
  if (movie.kmdb_docid) return { ok: false, error: '이미 KMDb와 연결된 영화입니다(연결 해제 후 다시 시도하세요).' };

  const movieYear = await getMovieYear(db, movieId);
  const searchRes = await client.searchByTitle(movie.title, { listCount: 20 });
  const candidates = mapSearchCandidates(searchRes);

  const ranked: RankedCandidate[] = candidates.map((c) => ({
    docId: c.docId,
    evaluation: evaluateCandidate({
      movieTitle: movie.title,
      movieTitleEn: movie.original_title,
      movieDirector: movie.director,
      movieYear,
      candidateTitle: c.title,
      candidateTitleEng: c.titleEng,
      candidateDirectors: c.directors,
      candidateYear: c.prodYear,
    }),
  }));

  const decision = decideLinkage(ranked);
  const autoLinkDocId = opts.reviewOnly ? null : decision.autoLinkDocId;

  if (opts.dryRun) {
    log(
      `(dry-run) [movie ${movieId}] ${movie.title} → ${decision.overallTier}` +
        (autoLinkDocId ? ` (자동 연결: ${autoLinkDocId})` : ' (검토 필요)') +
        `, 후보 ${ranked.length}건`,
    );
    return { ok: true, movieId, overallTier: decision.overallTier, autoLinked: !!autoLinkDocId, candidateCount: ranked.length };
  }

  return db.transaction(async (tx) => {
    for (const c of ranked) {
      const isChosen = c.docId === autoLinkDocId;
      const info = candidates.find((cand) => cand.docId === c.docId)!;
      await tx.run(
        `INSERT INTO movie_identifier_candidates
           (movie_id, kmdb_docid, kmdb_title, match_tier, match_signals, status, auto_linked, reviewed_by, reviewed_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT (movie_id, kmdb_docid)
         DO UPDATE SET match_tier = excluded.match_tier, match_signals = excluded.match_signals`,
        [
          movieId,
          c.docId,
          info.title,
          c.evaluation.tier,
          JSON.stringify(c.evaluation.signals),
          isChosen ? 'approved' : 'pending',
          isChosen ? 1 : 0,
          isChosen ? 'auto' : null,
          isChosen ? nowIso : null,
          nowIso,
        ],
      );
    }

    if (autoLinkDocId) {
      await tx.run(`UPDATE movies SET kmdb_docid = ? WHERE id = ?`, [autoLinkDocId, movieId]);
      await tx.run(
        `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
        [
          'system',
          'identifier_link_auto',
          'movie_identifier_link',
          movieId,
          JSON.stringify({ kmdbDocId: autoLinkDocId, tier: decision.overallTier }),
          nowIso,
        ],
      );
      log(`+ [movie ${movieId}] ${movie.title} → 자동 연결(${decision.overallTier}) DOCID=${autoLinkDocId}`);
    } else {
      log(`? [movie ${movieId}] ${movie.title} → 검토 필요(${decision.overallTier}), 후보 ${ranked.length}건`);
    }
    return { ok: true, movieId, overallTier: decision.overallTier, autoLinked: !!autoLinkDocId, candidateCount: ranked.length };
  });
}

export interface CandidateRow {
  id: number;
  movieId: number;
  kmdbDocid: string;
  kmdbTitle: string;
  matchTier: MatchTier;
  matchSignals: { titleMatch: boolean; directorMatch: boolean | null; yearDiff: number | null };
  status: 'pending' | 'approved' | 'rejected';
  autoLinked: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

function toCandidateRow(r: {
  id: number;
  movie_id: number;
  kmdb_docid: string;
  kmdb_title: string;
  match_tier: string;
  match_signals: string;
  status: string;
  auto_linked: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}): CandidateRow {
  return {
    id: r.id,
    movieId: r.movie_id,
    kmdbDocid: r.kmdb_docid,
    kmdbTitle: r.kmdb_title,
    matchTier: r.match_tier as MatchTier,
    matchSignals: JSON.parse(r.match_signals),
    status: r.status as CandidateRow['status'],
    autoLinked: Boolean(r.auto_linked),
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
  };
}

const CANDIDATE_SELECT = `SELECT id, movie_id, kmdb_docid, kmdb_title, match_tier, match_signals, status, auto_linked, reviewed_by, reviewed_at, created_at FROM movie_identifier_candidates`;

/** 관리자 검토 대기 목록 — 영화당 최소 1개는 status='pending'인 것만(자동 연결된 건 제외). */
export async function listPendingMovies(
  db: DbClient = getAppDbClient(),
): Promise<{ movieId: number; movieTitle: string; candidateCount: number; bestTier: MatchTier }[]> {
  const rows = await db.query<{ movie_id: number; title: string; n: number; best_tier: string }>(
    `SELECT c.movie_id, m.title, COUNT(*) AS n,
            MIN(CASE c.match_tier WHEN 'exact' THEN 0 WHEN 'high_confidence' THEN 1 WHEN 'needs_review' THEN 2 WHEN 'conflict' THEN 3 ELSE 4 END) AS best_tier_rank
     FROM movie_identifier_candidates c
     JOIN movies m ON m.id = c.movie_id
     WHERE c.movie_id NOT IN (SELECT movie_id FROM movie_identifier_candidates WHERE status = 'approved')
     GROUP BY c.movie_id, m.title
     ORDER BY best_tier_rank, m.title`,
  );
  const TIER_BY_RANK: MatchTier[] = ['exact', 'high_confidence', 'needs_review', 'conflict', 'unmatched'];
  return rows.map((r) => ({
    movieId: r.movie_id,
    movieTitle: r.title,
    candidateCount: r.n,
    bestTier: TIER_BY_RANK[Number((r as unknown as { best_tier_rank: number }).best_tier_rank ?? 4)] ?? 'unmatched',
  }));
}

type CandidateSqlRow = Parameters<typeof toCandidateRow>[0];

export async function getCandidatesForMovie(movieId: number, db: DbClient = getAppDbClient()): Promise<CandidateRow[]> {
  const rows = await db.query<CandidateSqlRow>(`${CANDIDATE_SELECT} WHERE movie_id = ? ORDER BY match_tier, kmdb_docid`, [
    movieId,
  ]);
  return rows.map(toCandidateRow);
}

export interface ReviewActionOptions {
  actor: string;
  now?: () => Date;
  db?: DbClient;
}

/** 후보 하나를 승인 — 같은 영화의 다른 승인 후보는 자동으로 거절 처리된다(연결은 항상 하나만). */
export async function approveCandidate(
  candidateId: number,
  opts: ReviewActionOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const candidate = (await db.query<{ id: number; movie_id: number; kmdb_docid: string }>(
    `SELECT id, movie_id, kmdb_docid FROM movie_identifier_candidates WHERE id = ?`,
    [candidateId],
  ))[0];
  if (!candidate) return { ok: false, error: '존재하지 않는 후보입니다.' };

  return db.transaction(async (tx) => {
    await tx.run(
      `UPDATE movie_identifier_candidates SET status='rejected', reviewed_by=?, reviewed_at=?
       WHERE movie_id=? AND status='approved' AND id != ?`,
      [opts.actor, nowIso, candidate.movie_id, candidateId],
    );
    await tx.run(
      `UPDATE movie_identifier_candidates SET status='approved', reviewed_by=?, reviewed_at=? WHERE id=?`,
      [opts.actor, nowIso, candidateId],
    );
    await tx.run(`UPDATE movies SET kmdb_docid = ? WHERE id = ?`, [candidate.kmdb_docid, candidate.movie_id]);
    await tx.run(
      `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
      [
        opts.actor,
        'identifier_link_approve',
        'movie_identifier_link',
        candidate.movie_id,
        JSON.stringify({ kmdbDocId: candidate.kmdb_docid }),
        nowIso,
      ],
    );
    return { ok: true };
  });
}

export async function rejectCandidate(
  candidateId: number,
  opts: ReviewActionOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const candidate = (await db.query<{ id: number; movie_id: number; kmdb_docid: string; status: string }>(
    `SELECT id, movie_id, kmdb_docid, status FROM movie_identifier_candidates WHERE id = ?`,
    [candidateId],
  ))[0];
  if (!candidate) return { ok: false, error: '존재하지 않는 후보입니다.' };

  return db.transaction(async (tx) => {
    await tx.run(
      `UPDATE movie_identifier_candidates SET status='rejected', reviewed_by=?, reviewed_at=? WHERE id=?`,
      [opts.actor, nowIso, candidateId],
    );
    if (candidate.status === 'approved') {
      await tx.run(`UPDATE movies SET kmdb_docid = NULL WHERE id = ? AND kmdb_docid = ?`, [
        candidate.movie_id,
        candidate.kmdb_docid,
      ]);
    }
    await tx.run(
      `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
      [opts.actor, 'identifier_link_reject', 'movie_identifier_link', candidate.movie_id, JSON.stringify({ kmdbDocId: candidate.kmdb_docid }), nowIso],
    );
    return { ok: true };
  });
}

/** 이미 연결된 영화의 연결을 해제한다(잘못 연결된 경우) — 후보 기록 자체는 지우지 않고
 * approved였던 후보를 rejected로 되돌린다. */
export async function unlinkMovie(
  movieId: number,
  opts: ReviewActionOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const movie = (await db.query<{ kmdb_docid: string | null }>(`SELECT kmdb_docid FROM movies WHERE id = ?`, [movieId]))[0];
  if (!movie) return { ok: false, error: '존재하지 않는 영화입니다.' };
  if (!movie.kmdb_docid) return { ok: false, error: '연결돼 있지 않은 영화입니다.' };

  return db.transaction(async (tx) => {
    await tx.run(
      `UPDATE movie_identifier_candidates SET status='rejected', reviewed_by=?, reviewed_at=? WHERE movie_id=? AND status='approved'`,
      [opts.actor, nowIso, movieId],
    );
    await tx.run(`UPDATE movies SET kmdb_docid = NULL WHERE id = ?`, [movieId]);
    await tx.run(
      `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
      [opts.actor, 'identifier_link_unlink', 'movie_identifier_link', movieId, JSON.stringify({ previousKmdbDocId: movie.kmdb_docid }), nowIso],
    );
    return { ok: true };
  });
}

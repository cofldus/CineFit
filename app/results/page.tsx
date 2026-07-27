import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompareTable } from '../../components/CompareTable';
import { RecommendCard } from '../../components/RecommendCard';
import { getRecommendations } from '../../src/data/recommendationService';
import { parseRecommendationInput } from '../../src/lib/validation';

export const metadata: Metadata = { title: '추천 결과' };
export const dynamic = 'force-dynamic';

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = parseRecommendationInput(raw);

  if (!parsed.ok) {
    return (
      <main>
        <h1>추천 결과</h1>
        <div className="card" role="alert">
          <h3 style={{ marginTop: 0 }}>입력값을 확인해 주세요</h3>
          <ul className="plain sub">
            {parsed.errors.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          <Link href="/movies" className="btn btn-primary">
            영화 선택으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const res = getRecommendations(parsed.input);
  if (!res.ok) notFound();
  const { result } = res;
  const origin = result.request.origin;

  return (
    <main>
      <h1>추천 결과</h1>
      <p className="sub">
        🎬 {result.movie.title} ({result.movie.runtimeMin}분) · {result.request.date} ·{' '}
        {origin.label ?? '지정 위치'} 출발 · 이동 ≤ {result.request.maxTravelMinutes}분 · 가격 ≤{' '}
        {result.request.maxPrice.toLocaleString('ko-KR')}원 — 후보 {result.totalCandidates}회차 중
        하드 필터 통과 {result.scored.length}
      </p>
      <p className="notice" role="note">
        ⚠️ 회차·가격은 검증용 합성 데이터입니다. 각 카드의 출처·확인일·상태 배지를 확인하세요.
      </p>

      {result.picks.length === 0 ? (
        <div className="card" role="alert" data-testid="empty-state">
          <h3 style={{ marginTop: 0 }}>조건에 맞는 상영 회차가 없습니다</h3>
          {result.excluded.length > 0 ? (
            <>
              <p className="sub">모든 후보가 다음 이유로 제외되었습니다:</p>
              <ul className="plain sub">
                {result.excluded.map((e) => (
                  <li key={e.candidate.showtimeId}>
                    · {e.candidate.location.name} {e.candidate.auditorium.no} — {e.reason}
                  </li>
                ))}
              </ul>
              <p className="sub">
                💡 최대 이동 시간을 늘리거나, 허용 포맷·가격 상한을 넓혀서 다시 시도해 보세요.
              </p>
            </>
          ) : (
            <p className="sub">해당 날짜에 등록된 회차 자체가 없습니다.</p>
          )}
          <Link href={`/recommend/${result.movie.id}`} className="btn btn-primary">
            조건 다시 입력
          </Link>
        </div>
      ) : (
        <>
          {result.picks.map((p, i) => (
            <RecommendCard key={p.scored.candidate.showtimeId} rank={i + 1} label={p.label} scored={p.scored} />
          ))}

          <CompareTable picks={result.picks} />

          {result.excluded.length > 0 ? (
            <details className="expand">
              <summary>하드 필터에서 제외된 회차 {result.excluded.length}건 보기</summary>
              <ul className="plain sub">
                {result.excluded.map((e) => (
                  <li key={e.candidate.showtimeId}>
                    · {e.candidate.location.name} {e.candidate.auditorium.no} — {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}

      <p style={{ marginTop: 16 }}>
        <Link href="/sources">이 추천에 쓰인 데이터 출처·신뢰도 기준 →</Link>
      </p>
    </main>
  );
}

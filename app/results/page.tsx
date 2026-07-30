import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { CompareTable } from '../../components/CompareTable';
import { IconFilm, IconLightbulb } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { RecommendCard } from '../../components/RecommendCard';
import { SelectionWidget } from '../../components/SelectionWidget';
import { serverAnalytics } from '../../src/analytics/serverAnalytics';
import { ANALYTICS_COOKIE } from '../../src/lib/analyticsSession';
import { getAppClock } from '../../src/lib/clock';
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
      <main className="mx-auto max-w-content px-4 pb-24 pt-6">
        <h1 className="text-2xl font-extrabold text-text">추천 결과</h1>
        <div className="mt-4 rounded-card-lg border border-trust-low/40 bg-trust-low/5 p-5" role="alert">
          <h3 className="m-0 text-lg font-bold text-text">입력값을 확인해 주세요</h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm text-text-sub">
            {parsed.errors.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          <Link
            href="/movies"
            className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white hover:bg-primary-strong-hover"
          >
            영화 선택으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const sessionId = (await cookies()).get(ANALYTICS_COOKIE)?.value;
  const res = await getRecommendations(parsed.input, { sessionId });
  if (!res.ok) notFound();
  const { result } = res;
  const origin = result.request.origin;

  // 추천 완료·빈 결과를 서버에서 직접 기록 — 클라이언트 왕복 없이 정확한 처리 시간을 남긴다.
  // app_opened 등으로 세션 쿠키가 이미 있을 때만 기록한다(없으면 session_id는 NULL로 남는다).
  if (sessionId && result.runId) {
    const dataConfidenceBucket =
      result.picks[0]?.scored.confidenceLabel ?? ('낮음' as const);
    if (result.picks.length > 0) {
      void serverAnalytics.recordEvent(
        'recommendation_completed',
        {
          recommendationRunId: result.runId,
          movieId: result.movie.id,
          candidateCount: result.scored.length,
          resultTypes: result.picks.map((p) => p.label),
          processingTimeMs: result.latencyMs ?? 0,
          dataConfidenceBucket,
          syntheticDataUsed: result.dataMode?.usedSynthetic ?? false,
        },
        { sessionId, now: getAppClock().now() },
      );
    } else {
      void serverAnalytics.recordEvent(
        'recommendation_empty',
        { movieId: result.movie.id, excludedCount: result.excluded.length },
        { sessionId, now: getAppClock().now() },
      );
    }
  }

  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6">
      <h1 className="font-wanted m-0 text-3xl font-bold tracking-[-0.01em] text-text">추천 결과</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-sub">
        <IconFilm className="h-4 w-4 shrink-0" />
        {result.movie.title} ({result.movie.runtimeMin}분) · {result.request.date} ·{' '}
        {origin.label ?? '지정 위치'} 출발 · 이동 ≤ {result.request.maxTravelMinutes}분 · 가격 ≤{' '}
        {result.request.maxPrice.toLocaleString('ko-KR')}원 — 조건에 맞는 회차 {result.scored.length}개
        (전체 {result.totalCandidates}개 중)
      </p>
      <div className="mt-3 max-w-content">
        {result.dataMode?.usedSynthetic ? (
          <Notice>
            이 결과의 회차·가격은 <strong className="font-semibold">검증용 합성 데이터</strong>예요(실제
            예매는 안 돼요). 각 카드의 출처·확인일·상태 배지를 확인해 주세요.
          </Notice>
        ) : (
          <Notice tone="success">
            관리자가 공식 예매 페이지에서 확인한 회차 기준입니다.
            {result.dataMode && result.dataMode.syntheticSuppressed > 0
              ? ` (검증용 합성 회차 ${result.dataMode.syntheticSuppressed}건은 제외됨)`
              : ''}
          </Notice>
        )}
      </div>

      {result.picks.length === 0 ? (
        <div
          className="mt-5 max-w-content rounded-card-lg border border-border bg-surface p-5"
          role="alert"
          data-testid="empty-state"
        >
          <h3 className="m-0 text-lg font-bold text-text">조건에 맞는 상영 회차가 없어요</h3>
          {result.excluded.length > 0 ? (
            <>
              <p className="mt-2 text-sm text-text-sub">모든 후보가 다음 이유로 제외됐어요:</p>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0 text-sm text-text-sub">
                {result.excluded.map((e) => (
                  <li key={e.candidate.showtimeId}>
                    · {e.candidate.location.name} {e.candidate.auditorium.no} — {e.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-text-sub">
                <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                최대 이동 시간을 늘리거나, 허용 포맷·가격 상한을 넓혀서 다시 시도해 보세요.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-sub">해당 날짜에 등록된 회차 자체가 없어요.</p>
          )}
          <Link
            href={`/recommend/${result.movie.id}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white hover:bg-primary-strong-hover"
          >
            조건 다시 입력
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {result.picks.map((p, i) => (
              <RecommendCard key={p.scored.candidate.showtimeId} rank={i + 1} label={p.label} scored={p.scored} runId={result.runId} />
            ))}
          </div>

          <div className="mt-6">
            <CompareTable picks={result.picks} />
          </div>

          {result.runId ? (
            <SelectionWidget
              runId={result.runId}
              picks={result.picks.map((p) => ({
                auditoriumId: p.scored.candidate.auditorium.id,
                auditoriumLabel: `${p.scored.candidate.location.name} ${p.scored.candidate.auditorium.no}`,
                pickLabel: p.label,
              }))}
            />
          ) : null}

          {result.runId ? (
            <p className="mt-4 max-w-content text-sm">
              <Link href={`/feedback/${result.runId}/post-watch`} className="font-medium text-primary">
                관람하고 오셨다면 여기서 만족도를 남겨주세요 →
              </Link>
            </p>
          ) : null}

          {result.excluded.length > 0 ? (
            <details className="mt-5 max-w-content rounded-card-lg border border-border bg-surface p-4">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
                조건에 안 맞아 제외된 회차 {result.excluded.length}건 보기
              </summary>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm text-text-sub">
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

      <p className="mt-5">
        <Link href="/sources" className="text-sm font-medium text-primary">
          이 추천에 쓰인 정보 출처·신뢰도 기준 보기 →
        </Link>
      </p>
    </main>
  );
}

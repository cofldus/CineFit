import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DetailedCompare, DifferenceSummary } from '../../components/CompareTable';
import { FeedbackWidget } from '../../components/FeedbackWidget';
import { IconLightbulb } from '../../components/Icon';
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
      <main className="cinema-scope min-h-dvh max-w-none bg-bg px-4 pb-24 pt-6">
        <div className="mx-auto max-w-content">
        <h1 className="text-2xl font-bold text-text">추천 결과</h1>
        <div className="mt-4 rounded-card-lg border border-trust-low/40 bg-trust-low/5 p-5" role="alert">
          <h3 className="m-0 text-lg font-bold text-text">입력값을 확인해 주세요</h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm text-text-sub">
            {parsed.errors.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          <Link
            href="/movies"
            className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
          >
            영화 선택으로 돌아가기
          </Link>
        </div>
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
    <main className="cinema-scope min-h-dvh max-w-none bg-bg px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-wide">
      {/* 1. 결과 제목과 검색 조건 — 관리자 보고서형 "추천 결과" 대신, 결과 화면을 경험의
          클라이맥스로 만드는 디스플레이 헤드라인. 데스크톱에서도 작아 보이지 않게 크게,
          타이트한 자간·줄간격으로. 다크 배경은 main이 전폭으로 채우고(밝은 여백 금지),
          내용만 이 래퍼로 제한한다. */}
      <header>
        <p className="enter-1 m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">추천 결과</p>
        <h1 className="enter-1 type-display m-0 mt-2.5 text-[34px] text-text sm:text-[46px]">
          {result.picks.length > 0 ? '오늘 가장 잘 맞는 선택' : '조건을 조금 넓혀볼까요?'}
        </h1>
        <p className="enter-2 m-0 mt-4 text-lg font-bold text-text">{result.movie.title}</p>
        <p className="enter-2 m-0 mt-0.5 tabular-nums text-[13.5px] text-text-sub">
          {result.movie.runtimeMin}분 · {result.request.date}
        </p>
        <p className="enter-2 m-0 mt-1.5 text-[15px] text-text-sub">
          {origin.label ?? '지정 위치'} 출발 · 이동 {result.request.maxTravelMinutes}분 이내 ·{' '}
          {result.request.maxPrice.toLocaleString('ko-KR')}원 이하
        </p>
        <p className="enter-2 m-0 mt-1 text-[13px] text-text-tertiary">
          조건에 맞는 회차 {result.scored.length}개 (전체 {result.totalCandidates}개 중)
        </p>
      </header>

      {/* 2. 데이터 안내 */}
      <div className="enter-2 mt-5 max-w-content">
        {result.dataMode?.usedSynthetic ? (
          <Notice detail="각 카드의 상세 보기에서 출처·확인일·상태를 확인할 수 있어요.">
            검증용 합성 데이터입니다. 실제 예매는 지원하지 않아요.
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
        <div className="mt-8 max-w-content border-t border-border pt-8" role="alert" data-testid="empty-state">
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
            className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
          >
            조건 다시 입력
          </Link>
        </div>
      ) : (
        <>
          {/* 3~4. 대표 추천 + 대안 레일 — 데스크톱은 1위 모듈 옆에 2·3위 비교 레일을 세로로
              배치해 넓은 화면을 실제로 사용한다. 모바일은 1위 아래에 2·3위를 가로 스와이프로
              (다음 카드가 살짝 잘려 보이게). 영화의 실제 화면비(native_ar)는 1위 스크린
              그래픽에 전달. */}
          <div className="enter-3 mt-8 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start lg:gap-6">
            {result.picks[0] ? (
              <RecommendCard
                rank={1}
                label={result.picks[0].label}
                scored={result.picks[0].scored}
                request={result.request}
                nativeAr={result.movie.specs.native_ar ? Number(result.movie.specs.native_ar.value) || null : null}
              />
            ) : null}

            {result.picks.length > 1 ? (
              <div className="enter-4 -mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 sm:pb-0 lg:mt-0 lg:flex-col lg:overflow-visible">
                {result.picks.slice(1).map((p, i) => (
                  <div key={p.scored.candidate.showtimeId} className="w-[86%] shrink-0 snap-start sm:w-[70%] lg:w-auto lg:shrink">
                    <RecommendCard
                      rank={i + 2}
                      label={p.label}
                      scored={p.scored}
                      request={result.request}
                      top={result.picks[0]?.scored}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* 5. 추천 차이 요약 */}
          <section className="enter-5 mt-10 max-w-content">
            <h2 className="m-0 text-[21px] font-bold text-text">추천 차이 한눈에</h2>
            <div className="mt-3">
              <DifferenceSummary picks={result.picks} />
            </div>
          </section>

          {/* 6. 상세 비교 */}
          <section className="enter-5 mt-8 max-w-content">
            <DetailedCompare picks={result.picks} />
          </section>

          {/* 7. 피드백 — 카드마다 반복하던 질문을 페이지 하단 한 곳으로 합쳤다 */}
          {result.runId ? (
            <div className="mt-10 max-w-content">
              <SelectionWidget
                runId={result.runId}
                picks={result.picks.map((p) => ({
                  auditoriumId: p.scored.candidate.auditorium.id,
                  auditoriumLabel: `${p.scored.candidate.location.name} ${p.scored.candidate.auditorium.no}`,
                  pickLabel: p.label,
                }))}
              />
              {result.picks[0] ? (
                <div className="mt-4 border-t border-border pt-4">
                  <FeedbackWidget runId={result.runId} showtimeId={result.picks[0].scored.candidate.showtimeId} />
                </div>
              ) : null}
            </div>
          ) : null}

          {result.excluded.length > 0 ? (
            <details className="mt-6 max-w-content border-t border-border pt-4">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-text hover:underline decoration-border-strong underline-offset-2">
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

      {/* 8. 출처 및 서비스 정보 */}
      <p className="mt-8 max-w-content border-t border-border pt-6">
        <Link
          href="/sources"
          className="text-sm font-medium text-text hover:underline decoration-border-strong underline-offset-2"
        >
          이 추천에 쓰인 정보 출처·신뢰도 기준 보기 →
        </Link>
      </p>
      {result.runId ? (
        <p className="mt-3 max-w-content text-sm">
          <Link
            href={`/feedback/${result.runId}/post-watch`}
            className="font-medium text-text hover:underline decoration-border-strong underline-offset-2"
          >
            관람하고 오셨다면 여기서 만족도를 남겨주세요 →
          </Link>
        </p>
      ) : null}
      </div>
    </main>
  );
}

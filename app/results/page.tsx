import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DetailedCompare, DifferenceSummary } from '../../components/CompareTable';
import { diffVsTop } from '../../components/RecommendCard';
import { pickPersonality } from '../../src/lib/display';
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
        <p className="enter-2 m-0 mt-4 text-lg font-bold text-text">
          {result.movie.title}
          <span className="ml-2 align-middle text-[13.5px] font-medium tabular-nums text-text-sub">
            {result.movie.runtimeMin}분 · {result.request.date}
          </span>
        </p>
        {/* 이번 추천의 조건 맥락 — 문장 나열 대신 스캔 가능한 칩으로 */}
        <div className="enter-2 mt-3 flex flex-wrap items-center gap-1.5">
          {[
            `${origin.label ?? '지정 위치'} 출발`,
            `이동 ${result.request.maxTravelMinutes}분 이내`,
            `${result.request.maxPrice.toLocaleString('ko-KR')}원 이하`,
          ].map((chip) => (
            <span key={chip} className="rounded-full bg-surface-raised px-3 py-1 text-[12.5px] font-medium tabular-nums text-text-sub">
              {chip}
            </span>
          ))}
          <span className="text-[12.5px] tabular-nums text-text-tertiary">
            조건에 맞는 회차 {result.scored.length}개 / 전체 {result.totalCandidates}개
          </span>
        </div>
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
          <div
            className={`enter-3 mt-8 ${
              result.picks.length > 1
                ? 'lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-6'
                : 'mx-auto max-w-[880px]'
            }`}
          >
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
              <div className="enter-4 -mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 sm:pb-0 lg:mt-0 lg:h-full lg:flex-col lg:overflow-visible">
                {result.picks.slice(1).map((p, i) => (
                  <div key={p.scored.candidate.showtimeId} className="flex w-[86%] shrink-0 snap-start sm:w-[70%] lg:w-auto lg:min-h-0 lg:flex-1 lg:shrink">
                    <RecommendCard
                      rank={i + 2}
                      label={p.label}
                      scored={p.scored}
                      request={result.request}
                      top={result.picks[0]?.scored}
                      personality={pickPersonality(
                        p.scored,
                        result.picks.map((x) => x.scored),
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* 5. 1위와 비교 — 순위별 핵심 차이를 문장으로. 각 카드를 따로 읽지 않아도
              "왜 1위인지"가 보이게 한다. */}
          {result.picks.length > 1 ? (
            <section className="enter-5 mt-10 max-w-content">
              <h2 className="m-0 text-[21px] font-bold text-text">1위와 비교하면</h2>
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {result.picks.slice(1).map((p, i) => {
                  const diff = result.picks[0] ? diffVsTop(p.scored, result.picks[0].scored) : null;
                  const tag = pickPersonality(
                    p.scored,
                    result.picks.map((x) => x.scored),
                  );
                  return (
                    <li
                      key={p.scored.candidate.showtimeId}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card bg-surface-raised px-4 py-3"
                    >
                      <span className="text-[12px] font-bold text-text-tertiary">{i + 2}위</span>
                      <span className="min-w-0 font-semibold text-text">
                        {p.scored.candidate.location.name} {p.scored.candidate.auditorium.no}
                      </span>
                      {tag ? (
                        <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[11.5px] font-bold text-primary">{tag}</span>
                      ) : null}
                      <span className="text-[13.5px] text-text-sub">{diff ?? '1위와 조건 차이가 크지 않아요'}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4">
                <DifferenceSummary picks={result.picks} />
              </div>
            </section>
          ) : null}

          {/* 6. 상세 비교 */}
          <section className="enter-5 mt-8 max-w-content">
            <DetailedCompare picks={result.picks} />
          </section>

          {/* 7. 피드백 — 짧은 2버튼 질문이 먼저, 긴 선택 기록은 접힌 패널로(설문이 결과보다
              길어 보이지 않게). */}
          {result.runId ? (
            <div className="mt-10 max-w-content border-t border-border pt-6">
              {result.picks[0] ? (
                <FeedbackWidget runId={result.runId} showtimeId={result.picks[0].scored.candidate.showtimeId} />
              ) : null}
              <details className="mt-5">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-text-sub hover:text-text">
                  실제로 고른 상영관 남기기 — 추천 품질 개선에 활용돼요
                </summary>
                <div className="mt-2">
                  <SelectionWidget
                    runId={result.runId}
                    picks={result.picks.map((p) => ({
                      auditoriumId: p.scored.candidate.auditorium.id,
                      auditoriumLabel: `${p.scored.candidate.location.name} ${p.scored.candidate.auditorium.no}`,
                      pickLabel: p.label,
                    }))}
                  />
                </div>
              </details>
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

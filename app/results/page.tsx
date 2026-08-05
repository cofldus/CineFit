import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DetailedCompare, DifferenceSummary } from '../../components/CompareTable';
import { ShareLinkButton } from '../../components/ShareLinkButton';
import { PREMIUM_ALLOWANCE_OPTIONS } from '../../src/data/constants';
import { INFO_STATUS_LABELS } from '../../src/domain/recommendation/presets';
import { pickPersonality } from '../../src/lib/display';
import { FeedbackWidget } from '../../components/FeedbackWidget';
import { IconLightbulb } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { RecommendCard } from '../../components/RecommendCard';
import { SelectionWidget } from '../../components/SelectionWidget';
import { serverAnalytics } from '../../src/analytics/serverAnalytics';
import { TrackedExternalLink, TrackedLink } from '../../components/TrackedLink';
import { AXIS_POLICY_VERSION } from '../../src/domain/recommendation/axisWeights';
import { ANALYTICS_COOKIE } from '../../src/lib/analyticsSession';
import { getAppClock } from '../../src/lib/clock';
import { getRecommendations } from '../../src/data/recommendationService';
import { suggestRelaxations } from '../../src/domain/recommendation/relaxation';
import {
  deriveCandidateDataState,
  formatCheckedAt,
  isStale,
  latestCheckedAt,
} from '../../src/lib/dataFreshness';
import { parseRecommendationInput } from '../../src/lib/validation';

// 극장사 공식 상영시간표 홈 — 회차 데이터가 없거나 오래됐을 때 안내하는 공식 경로.
const OFFICIAL_SCHEDULES = [
  { chain: 'cgv', label: 'CGV 공식 상영시간표 ↗', href: 'http://www.cgv.co.kr/theaters/' },
  { chain: 'lotte', label: '롯데시네마 공식 상영시간표 ↗', href: 'https://www.lottecinema.co.kr' },
  { chain: 'megabox', label: '메가박스 공식 상영시간표 ↗', href: 'https://www.megabox.co.kr' },
];

// 현재 결과 URL에 완화 파라미터를 덮어쓴 링크 — 값이 빈 문자열이면 그 파라미터 제거.
function relaxedHref(raw: Record<string, string | string[] | undefined>, params: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') qs.set(k, v);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v === '') qs.delete(k);
    else qs.set(k, v);
  }
  return `/results?${qs.toString()}`;
}

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
  const now = getAppClock().now();

  // R20 §9: 데이터 신선도 — 관리자 확인 회차 기준의 마지막 확인 시각. 오래됐으면(stale)
  // 예매 가능한 것처럼 보이지 않게 재확인 안내를 붙인다. 합성(테스트) 데이터는 별도 상태.
  const usedSynthetic = result.dataMode?.usedSynthetic ?? false;
  const verifiedCheckedAt = usedSynthetic
    ? null
    : latestCheckedAt(result.scored.map((s) => s.candidate));
  const dataStale = !usedSynthetic && result.scored.length > 0 && isStale(verifiedCheckedAt, now);

  // R20 §9 zero result: 어떤 조건을 완화하면 몇 개가 추가되는지 — 이미 조회된 후보로
  // 엔진을 재실행해 실측한다(placeholder 숫자 없음).
  const allCandidates = [
    ...result.scored.map((s) => s.candidate),
    ...result.excluded.map((e) => e.candidate),
  ];
  const relaxations =
    result.picks.length === 0 && allCandidates.length > 0
      ? suggestRelaxations({
          movie: result.movie,
          candidates: allCandidates,
          request: result.request,
          now,
          baseCount: result.scored.length,
        })
      : [];

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
      // R21: zero result 발생 조건 집계용(비민감 요약만 — 좌표·주소 없음).
      void serverAnalytics.recordEvent(
        'zero_results_shown',
        {
          recommendationRunId: result.runId,
          movieId: result.movie.id,
          timeWindow: result.request.timeWindow ?? 'any',
          maxTravelMinutes: result.request.maxTravelMinutes,
          priority: result.request.priority,
        },
        { sessionId, now: getAppClock().now() },
      );
    }
    // R21: 실행 1건 = 이벤트 1건(run id가 매번 새로 발급되므로 중복 없음).
    void serverAnalytics.recordEvent(
      'recommendation_generated',
      {
        recommendationRunId: result.runId,
        movieId: result.movie.id,
        candidateCount: result.scored.length,
        policyVersion: AXIS_POLICY_VERSION,
        dataState: deriveCandidateDataState({ total: result.totalCandidates, usedSynthetic }),
        zeroResult: result.picks.length === 0,
      },
      { sessionId, now: getAppClock().now() },
    );
  }

  return (
    <main className="cinema-scope min-h-dvh max-w-none bg-bg px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <div className="mx-auto max-w-wide">
      {/* 1. 결과 헤더(R14 §9A) — 지나치게 큰 광고 제목 대신 페이지 타이틀 스케일. 그 아래
          영화·날짜·출발·예산·허용 이동시간을 한 줄 compact summary strip으로 모은다. */}
      <header>
        <p className="enter-1 m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">추천 결과</p>
        <h1 className="enter-1 type-display m-0 mt-2 text-[28px] sm:text-[36px]">
          {result.picks.length > 0 ? '오늘 가장 잘 맞는 선택' : '조건을 조금 넓혀볼까요?'}
        </h1>
        <div className="enter-2 mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] tabular-nums">
          <span className="text-[15px] font-bold text-text">{result.movie.title}</span>
          <span className="text-text-sub">{result.movie.runtimeMin}분</span>
          <span aria-hidden className="h-3 w-px bg-border-strong" />
          <span className="text-text-sub">{result.request.date}</span>
          <span aria-hidden className="h-3 w-px bg-border-strong" />
          <span className="text-text-sub">{origin.label ?? '지정 위치'} 출발</span>
          <span aria-hidden className="h-3 w-px bg-border-strong" />
          <span className="text-text-sub">
            {result.request.maxTravelMinutes >= 240 ? '거리 제한 없음' : `편도 ${result.request.maxTravelMinutes}분 이내`}
          </span>
          <span aria-hidden className="h-3 w-px bg-border-strong" />
          {/* R19: 절대 예산 대신 추가 지불 의향 라벨(구 URL은 절대 상한 표기 유지). */}
          <span className="text-text-sub">
            {result.request.premiumAllowance
              ? (PREMIUM_ALLOWANCE_OPTIONS.find((o) => o.value === result.request.premiumAllowance)?.label ?? '')
              : `${result.request.maxPrice.toLocaleString('ko-KR')}원 이하`}
          </span>
          <span className="text-text-tertiary">
            · 조건에 맞는 회차 {result.scored.length}개 / 전체 {result.totalCandidates}개
          </span>
        </div>
      </header>

      {/* 2. 데이터 안내 — R20 §9: unavailable(회차 미연결·테스트 데이터)/stale(오래된
          확인)을 명시하고, 공식 상영시간표 경로를 함께 안내한다. */}
      <div className="enter-2 mt-5 max-w-content">
        {usedSynthetic ? (
          <>
            <Notice detail="상영관 환경(화면·좌석) 추천은 유효하지만, 실제 상영 시각·가격은 공식 페이지에서 확인해 주세요.">
              회차 데이터 연결 전 — 등록된 테스트 후보를 기준으로 계산한 결과예요. 실제 예매는 지원하지 않아요.
            </Notice>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
              {OFFICIAL_SCHEDULES.map((s) => (
                <TrackedExternalLink
                  key={s.href}
                  event="official_link_clicked"
                  eventProperties={{ chain: s.chain, context: 'results' }}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-text hover:underline decoration-border-strong underline-offset-2"
                >
                  {s.label}
                </TrackedExternalLink>
              ))}
            </div>
          </>
        ) : dataStale && verifiedCheckedAt ? (
          <Notice detail="상영 스케줄은 수시로 바뀌어요 — 예매 전 공식 상영시간표에서 다시 확인해 주세요.">
            마지막 확인 {formatCheckedAt(verifiedCheckedAt)} — 확인한 지 시간이 지난 회차 정보예요.
          </Notice>
        ) : (
          <Notice tone="success">
            관리자가 공식 예매 페이지에서 확인한 회차 기준입니다.
            {verifiedCheckedAt ? ` (마지막 확인 ${formatCheckedAt(verifiedCheckedAt)})` : ''}
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
              {/* R20 §9: 어떤 조건을 완화하면 몇 개가 추가되는지 실측 — 링크 한 번으로 적용. */}
              {relaxations.length > 0 ? (
                <div className="mt-4" data-testid="relaxation-suggestions">
                  <p className="m-0 flex items-start gap-1.5 text-sm font-semibold text-text">
                    <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    조건을 조금 완화하면 이렇게 늘어나요
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {relaxations.map((r) => (
                      <TrackedLink
                        key={r.key}
                        event="relaxation_suggestion_clicked"
                        eventProperties={{ suggestion: r.key, added: r.added }}
                        href={relaxedHref(raw, r.params)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-card border border-border px-4 text-[14px] font-medium text-text transition-colors hover:border-border-strong"
                      >
                        {r.label}
                        <span className="font-bold tabular-nums text-primary">+{r.added}개</span>
                      </TrackedLink>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-text-sub">
                  <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                  시간대·이동 한도를 넓혀도 이 날짜에는 추가되는 후보가 없어요 — 다른 날짜를 시도해 보세요.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-sub">
                이 날짜에 등록된 회차가 없어요 — 회차 데이터 연결 전이에요. 상영관 환경(화면·좌석) 정보는{' '}
                <Link href="/" className="font-medium text-text underline decoration-border-strong underline-offset-2">
                  홈의 최근 확인된 상영관 정보
                </Link>
                에서 볼 수 있어요.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                {OFFICIAL_SCHEDULES.map((s) => (
                  <TrackedExternalLink
                    key={s.href}
                    event="official_link_clicked"
                    eventProperties={{ chain: s.chain, context: 'zero_results' }}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium text-text hover:underline decoration-border-strong underline-offset-2"
                  >
                    {s.label}
                  </TrackedExternalLink>
                ))}
              </div>
            </>
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
          {/* 데스크톱 2열은 items-stretch(기본값) — 1위 카드가 2·3위 레일이 끝나는 지점과
              같은 높이로 끝난다(1열 내부는 flex로 아래 정렬 분배). */}
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
                nativeArStatus={
                  result.movie.specs.native_ar
                    ? (INFO_STATUS_LABELS[result.movie.specs.native_ar.infoStatus] ?? '추정')
                    : null
                }
                freshness={{ stale: dataStale, checkedAt: verifiedCheckedAt }}
                runId={result.runId}
              />
            ) : null}

            {/* 2·3위 모바일: viewport-48px 폭 + snap — 다음 카드가 28px만 살짝 보인다(R15 §6). */}
            {result.picks.length > 1 ? (
              <div className="enter-4 -mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 sm:pb-0 lg:mt-0 lg:flex-col lg:overflow-visible">
                {result.picks.slice(1).map((p, i) => (
                  <div
                    key={p.scored.candidate.showtimeId}
                    className="flex w-[calc(100vw-48px)] shrink-0 snap-start sm:w-[70%] lg:w-auto lg:shrink"
                  >
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
                      runId={result.runId}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* 5. 1위와 비교 — 순위별 차이 행은 이제 각 대안 카드 안에 구조화돼 있으므로,
              여기서는 관점별 결론(가장 좋은 상영 환경/가장 저렴/가장 짧은 이동)만 남기고
              각 항목에서 해당 후보 카드로 바로 이동할 수 있게 한다(R14 §9F). */}
          {result.picks.length > 1 ? (
            <section id="compare-rail" className="enter-5 mt-10 max-w-content">
              <h2 className="m-0 text-[21px] font-bold text-text">1위와 비교하면</h2>
              <div className="mt-2">
                <DifferenceSummary picks={result.picks} />
              </div>
              {/* 상세 비교는 이 섹션의 액션으로 통합 — 빈 "세부 수치 비교" 문구 단독 노출 금지. */}
              <div className="mt-3">
                <DetailedCompare picks={result.picks} />
              </div>
            </section>
          ) : null}

          {/* 6. 다음 행동(R15 §6) — 결과를 본 뒤 바로 할 수 있는 4가지. 합성 데이터면 공식
              예매 확인이 왜 비활성인지 명확히 적는다. */}
          <section className="enter-5 mt-10 max-w-content">
            <h2 className="m-0 text-[21px] font-bold text-text">다음 행동</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {result.picks[0]?.scored.candidate.bookingUrl && !result.picks[0].scored.candidate.isSynthetic ? (
                <a
                  href={result.picks[0].scored.candidate.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn-cta flex min-h-12 items-center justify-center rounded-card bg-primary-strong px-4 text-[14.5px] font-semibold text-white hover:bg-primary-strong-hover"
                >
                  공식 상영시간표·예매 확인 ↗
                </a>
              ) : (
                <span
                  aria-disabled
                  className="flex min-h-12 items-center justify-center rounded-card border border-border px-4 text-center text-[13px] leading-snug text-text-tertiary"
                >
                  검증용 합성 회차라 공식 예매 페이지가 없어요
                </span>
              )}
              <TrackedLink
                event="conditions_edited"
                eventProperties={result.runId ? { recommendationRunId: result.runId } : {}}
                href={`/recommend/${result.movie.id}`}
                className="flex min-h-12 items-center justify-center rounded-card border border-border px-4 text-[14.5px] font-medium text-text transition-colors hover:border-border-strong"
              >
                조건 수정하기
              </TrackedLink>
              {result.picks.length > 1 ? (
                <a
                  href="#compare-rail"
                  className="flex min-h-12 items-center justify-center rounded-card border border-border px-4 text-[14.5px] font-medium text-text transition-colors hover:border-border-strong"
                >
                  다른 후보 비교
                </a>
              ) : null}
              <ShareLinkButton className="flex min-h-12 items-center justify-center rounded-card border border-border px-4 text-[14.5px] font-medium text-text transition-colors hover:border-border-strong" />
            </div>
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

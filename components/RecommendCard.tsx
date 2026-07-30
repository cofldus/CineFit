import Link from 'next/link';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';
import { citationsTrustSummary, pct, scoreInterpretation } from '../src/lib/display';
import { FeedbackWidget } from './FeedbackWidget';
import { FormatTag } from './FormatTag';
import { IconNote, IconPrice, IconQuestion, IconSeat, IconThumbsDown, IconThumbsUp, IconTransit, IconWrench } from './Icon';
import { TrackedExternalLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

// 카드 제목만 보고도 대안이 어떤 상황에 맞는 선택인지 구분되도록 — PickLabel(데이터 값)은
// 그대로 두고 화면 표시 문구만 상황 서술형으로 바꿨다.
const PICK_SCENARIO: Record<PickLabel, string> = {
  균형: '가장 균형 잡힌 선택',
  품질: '화질과 사운드를 더 중요하게 본다면',
  '근접·가성비': '이동과 가격을 더 아끼고 싶다면',
};

// 결과 화면에서 빨간색은 CTA 버튼 하나에만 집중시킨다 — 나머지 보조 링크(자세히 보기·비교
// 전체 보기 등)는 중성색 밑줄 링크로 통일했다.
const QUIET_LINK = 'text-text underline decoration-border underline-offset-2 hover:decoration-primary-strong';

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-sub">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

function DetailPanel({ scored, restPros }: { scored: ScoredCandidate; restPros: string[] }) {
  const hasMore = restPros.length > 0 || scored.cons.length > 0 || scored.uncertainties.length > 0;
  return (
    <details className="mt-3 border-t border-border pt-3">
      <summary className={`flex min-h-11 cursor-pointer items-center text-[13px] font-medium ${QUIET_LINK}`}>
        {hasMore ? '더 자세히 보기 (이유·고려할 점·점수 계산·출처)' : '점수는 어떻게 계산되나요?'}
      </summary>

      {hasMore ? (
        <div className="mt-3 flex flex-col gap-3 text-[15px] text-text">
          {restPros.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {restPros.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <IconThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-trust-high" />
                  {p}
                </li>
              ))}
            </ul>
          ) : null}
          {scored.cons.length > 0 ? (
            <div>
              <h4 className="m-0 mb-1.5 text-[13px] font-bold text-text-sub">고려할 점</h4>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {scored.cons.slice(0, 2).map((n) => (
                  <li key={n} className="flex items-start gap-2">
                    <IconThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-trust-mid" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {scored.uncertainties.length > 0 ? (
            <div>
              <h4 className="m-0 mb-1.5 text-[13px] font-bold text-text-sub">확인 필요</h4>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {scored.uncertainties.slice(0, 2).map((u) => (
                  <li key={u} className="flex items-start gap-2">
                    <IconQuestion className="mt-0.5 h-4 w-4 shrink-0 text-text-sub" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mb-2 mt-3 text-[13px] text-text-sub">
        아래 항목들을 종합해서 계산한 적합도예요. 영화의 절대적인 품질이 아니라{' '}
        <strong className="font-semibold text-text">지금 입력한 조건에서만</strong> 상대적으로 얼마나
        잘 맞는지를 나타내요.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <StatRow label="종합 적합도" value={pct(scored.final)} />
        <StatRow label="신뢰 보정" value={pct(scored.trust)} />
        <StatRow label="포맷 만족도" value={pct(scored.axes.ffm)} />
        <StatRow label="상영관 품질" value={pct(scored.axes.audQ)} />
        <StatRow label="시간대 적합도" value={pct(scored.axes.pm)} />
        <StatRow label="정보 신뢰도" value={pct(scored.axes.dc)} />
        <StatRow label="최신성" value={pct(scored.axes.fr)} />
      </div>
      {scored.candidate.auditorium.spec?.renewalEvent ? (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] text-text-sub">
          <IconWrench className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.renewalEvent}
        </p>
      ) : null}
      {scored.candidate.auditorium.spec?.notes ? (
        <p className="mt-1 flex items-start gap-1.5 text-[13px] text-text-sub">
          <IconNote className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.notes}
        </p>
      ) : null}
      <p className="mt-2 text-[13px] text-text-sub">
        좌석 구역 추천 근거({scored.seatZone.label}): {scored.seatZone.rationale.join(' / ')}
      </p>
      <h4 className="mb-1 mt-3 text-[13px] font-bold text-text">이 추천에 사용된 출처</h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
        {scored.citations.map((cit, i) => (
          <li key={`${cit.what}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-text-sub">{cit.what}</span>
            {cit.sourceUrl ? (
              <a className={QUIET_LINK} href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
                {cit.sourceName}
              </a>
            ) : (
              <span>{cit.sourceName}</span>
            )}
            <TrustBadge status={cit.infoStatus} observedAt={cit.observedAt} />
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * 결과 페이지 위계 개편(2차) — 1순위 카드를 좌(이유·정체성) / 우(핵심 숫자·CTA) 2단 구성으로
 * 바꿔 넓어진 카드 안 여백을 없앴다. 강조는 굵은 빨간 테두리 대신 상단 얇은 스트립 하나로
 * 낮췄다(카드 전체가 경고처럼 보인다는 피드백). 적합도는 앞면에서 숫자(%) 없이 해석 문구만
 * 보여주고, 정확한 수치는 "더 자세히 보기" 안에서만 노출한다. 보조 링크(자세히 보기·비교
 * 전체 보기 등)는 전부 중성색으로 바꿔 빨간색이 CTA 버튼 하나에만 집중되게 했다.
 */
export function RecommendCard({
  rank,
  label,
  scored,
  runId,
}: {
  rank: number;
  label: PickLabel;
  scored: ScoredCandidate;
  /** 이 추천 실행의 recommendation_runs id — 있으면 카드에 즉시 피드백 위젯을 보여준다 */
  runId?: number;
}) {
  const { candidate: c } = scored;
  const isTop = rank === 1;
  const trustSummary = citationsTrustSummary(scored.citations);

  if (isTop) {
    const [reason1, reason2, reason3, ...restPros] = scored.pros;
    const reasons = [reason1, reason2, reason3].filter((r): r is string => Boolean(r));

    return (
      <article
        className="overflow-hidden rounded-card-xl border border-border bg-surface"
        aria-labelledby={`pick-${rank}-title`}
        data-testid={`pick-${label}`}
      >
        <div aria-hidden className="h-1 bg-primary-strong" />
        <div className="p-5 sm:p-6">
          <div className="sm:flex sm:items-start sm:gap-6">
            {/* 왼쪽: 정체성 + 이유 */}
            <div className="sm:w-[62%]">
              <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-text-sub">
                <span className="inline-flex items-center rounded-full bg-primary-strong px-2.5 py-0.5 text-[11px] font-bold text-white">
                  가장 잘 맞는 추천
                </span>
                {PICK_SCENARIO[label]}
              </p>
              <h2
                id={`pick-${rank}-title`}
                className="font-wanted m-0 mb-3 mt-2 text-[22px] font-bold tracking-[-0.01em] text-text"
              >
                {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
              </h2>

              {reasons.length > 0 ? (
                <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
                  {reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-[15px] leading-relaxed text-text">
                      <IconThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-trust-high" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="m-0 flex items-start gap-1.5 text-sm font-medium text-text-sub">
                <IconSeat className="mt-0.5 h-4 w-4 shrink-0" /> 추천 좌석 {scored.seatZone.zone}{' '}
                <span>({scored.seatZone.label})</span>
              </p>
            </div>

            {/* 오른쪽: 핵심 숫자 + CTA */}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:mt-0 sm:w-[38%] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
                <FormatTag format={c.format} />
              </div>
              <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-text">
                <IconTransit className="h-4 w-4 text-text-sub" /> {scored.travelMinutes}분(추정)
              </p>
              <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-text">
                <IconPrice className="h-4 w-4 text-text-sub" /> {c.priceAdult.toLocaleString('ko-KR')}원
              </p>
              <p className="m-0 text-sm font-semibold text-text">{scoreInterpretation(scored.final)}</p>
              <p className="m-0 text-[13px] text-text-sub">정보 상태: {trustSummary}</p>

              <Link
                href={`/cinemas/${c.auditorium.id}`}
                className="mt-1 flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-strong-hover sm:w-auto sm:self-start sm:px-6"
              >
                상영관 상세 보기
              </Link>
              {c.bookingUrl && !c.isSynthetic ? (
                <TrackedExternalLink
                  event="booking_link_clicked"
                  eventProperties={{ showtimeId: c.showtimeId }}
                  className={`inline-flex min-h-9 items-center text-[13px] font-medium ${QUIET_LINK}`}
                  href={c.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  공식 예매 페이지로 이동 ↗
                </TrackedExternalLink>
              ) : null}
            </div>
          </div>

          <DetailPanel scored={scored} restPros={restPros} />

          {runId ? <FeedbackWidget runId={runId} showtimeId={c.showtimeId} /> : null}
        </div>
      </article>
    );
  }

  const [topPro, ...restPros] = scored.pros;

  return (
    <article
      className="rounded-card-lg border border-border bg-surface p-4"
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <p className="m-0 text-[13px] font-semibold text-text-sub">{rank}순위</p>
      <p className="m-0 mt-0.5 text-sm text-text-sub">{PICK_SCENARIO[label]}</p>
      <h3 id={`pick-${rank}-title`} className="font-wanted m-0 mb-2 mt-1 text-base font-bold tracking-[-0.01em] text-text">
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <FormatTag format={c.format} />
        <span className="text-[13px] font-medium text-text-sub">{scoreInterpretation(scored.final)}</span>
      </div>

      {topPro ? (
        <p className="m-0 mb-2.5 flex items-start gap-1.5 text-sm leading-relaxed text-text">
          <IconThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trust-high" />
          {topPro}
        </p>
      ) : null}

      <div className="mb-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-medium text-text-sub">
        <span className="inline-flex items-center gap-1">
          <IconTransit className="h-3.5 w-3.5" /> {scored.travelMinutes}분
        </span>
        <span className="inline-flex items-center gap-1">
          <IconPrice className="h-3.5 w-3.5" /> {c.priceAdult.toLocaleString('ko-KR')}원
        </span>
        <span>{trustSummary}</span>
      </div>

      <Link href={`/cinemas/${c.auditorium.id}`} className={`inline-flex min-h-11 items-center text-sm font-semibold ${QUIET_LINK}`}>
        상세 보기 →
      </Link>

      <DetailPanel scored={scored} restPros={restPros} />

      {runId ? <FeedbackWidget runId={runId} showtimeId={c.showtimeId} /> : null}
    </article>
  );
}

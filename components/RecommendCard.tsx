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

// 카드 제목만 보고도 대안이 뭘 우선하는지 구분되도록(피드백 요구사항) — PickLabel 자체는
// 그대로 두고 화면 표시 문구만 짧게 다듬었다.
const PICK_DESC: Record<PickLabel, string> = {
  균형: '가장 균형 잡힌 선택',
  품질: '영상·음향 우선',
  '근접·가성비': '거리·가성비 우선',
};

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
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
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
              <h4 className="m-0 mb-1.5 text-xs font-bold text-text-sub">고려할 점</h4>
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
              <h4 className="m-0 mb-1.5 text-xs font-bold text-text-sub">확인 필요</h4>
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

      <p className="mb-2 mt-3 text-sm text-text-sub">
        아래 항목들을 종합해서 계산한 점수예요. 영화의 절대적인 품질이 아니라{' '}
        <strong className="font-semibold text-text">지금 입력한 조건에서만</strong> 상대적으로 얼마나
        잘 맞는지를 나타내요.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <StatRow label="종합 점수" value={pct(scored.final)} />
        <StatRow label="신뢰 보정" value={pct(scored.trust)} />
        <StatRow label="포맷 만족도" value={pct(scored.axes.ffm)} />
        <StatRow label="상영관 품질" value={pct(scored.axes.audQ)} />
        <StatRow label="시간대 적합도" value={pct(scored.axes.pm)} />
        <StatRow label="정보 신뢰도" value={pct(scored.axes.dc)} />
        <StatRow label="최신성" value={pct(scored.axes.fr)} />
      </div>
      {scored.candidate.auditorium.spec?.renewalEvent ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-text-sub">
          <IconWrench className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.renewalEvent}
        </p>
      ) : null}
      {scored.candidate.auditorium.spec?.notes ? (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-text-sub">
          <IconNote className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.notes}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-sub">
        좌석 구역 추천 근거({scored.seatZone.label}): {scored.seatZone.rationale.join(' / ')}
      </p>
      <h4 className="mb-1 mt-3 text-sm font-bold text-text">이 추천에 사용된 출처</h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
        {scored.citations.map((cit, i) => (
          <li key={`${cit.what}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-text-sub">{cit.what}</span>
            {cit.sourceUrl ? (
              <a className="text-primary underline underline-offset-2" href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
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
 * 결과 페이지 위계 개편 — 1순위는 넓고 강하게(3가지 핵심 이유를 문장으로), 2·3순위는 작은
 * 보조 카드로 축소한다. 카드 안에서 상태·확신도 배지를 여러 번 반복하던 것도 요약 문구
 * 하나(확인됨/일부 추정)로 합쳤다 — 합성 데이터 경고는 결과 페이지 상단의 안내문구
 * 하나로만 표시하고(app/results/page.tsx의 Notice) 카드마다 다시 반복하지 않는다.
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
        className="rounded-card-xl border-2 border-primary-strong bg-surface p-5 shadow-highlight sm:p-6"
        aria-labelledby={`pick-${rank}-title`}
        data-testid={`pick-${label}`}
      >
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-text-sub">
          <span className="inline-flex items-center rounded-full bg-primary-strong px-2.5 py-0.5 text-[11px] font-bold text-white">
            가장 잘 맞는 추천
          </span>
          {PICK_DESC[label]}
        </p>
        <h2
          id={`pick-${rank}-title`}
          className="font-wanted m-0 mb-3 mt-2 text-2xl font-bold tracking-[-0.01em] text-text"
        >
          {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
        </h2>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FormatTag format={c.format} />
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-sub">
            적합도 {pct(scored.final)} · {scoreInterpretation(scored.final)}
          </span>
        </div>

        {reasons.length > 0 ? (
          <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[15px] leading-relaxed text-text">
                <IconThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-trust-high" />
                {r}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm font-medium text-text-sub sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5">
            <IconTransit className="h-4 w-4" /> 이동 약 {scored.travelMinutes}분(추정)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconPrice className="h-4 w-4" /> {c.priceAdult.toLocaleString('ko-KR')}원
          </span>
          <span className="inline-flex items-center gap-1.5 sm:col-span-2">
            <IconSeat className="h-4 w-4" /> 추천 좌석 {scored.seatZone.zone} <span>({scored.seatZone.label})</span>
          </span>
        </div>

        <p className="m-0 mb-4 text-xs text-text-sub">정보 상태: {trustSummary}</p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/cinemas/${c.auditorium.id}`}
            className="flex min-h-12 flex-1 items-center justify-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-strong-hover"
          >
            상세 보기
          </Link>
          {c.bookingUrl && !c.isSynthetic ? (
            <TrackedExternalLink
              event="booking_link_clicked"
              eventProperties={{ showtimeId: c.showtimeId }}
              className="flex min-h-12 items-center justify-center px-2 text-[15px] font-medium text-primary underline underline-offset-2"
              href={c.bookingUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              공식 예매 페이지로 이동 ↗
            </TrackedExternalLink>
          ) : null}
        </div>

        <DetailPanel scored={scored} restPros={restPros} />

        {runId ? <FeedbackWidget runId={runId} showtimeId={c.showtimeId} /> : null}
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
      <p className="m-0 text-xs font-semibold text-text-sub">
        {rank}순위 · {PICK_DESC[label]}
      </p>
      <h3 id={`pick-${rank}-title`} className="font-wanted m-0 mb-2 mt-1 text-base font-bold tracking-[-0.01em] text-text">
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <FormatTag format={c.format} />
        <span className="text-xs font-medium text-text-sub">
          적합도 {pct(scored.final)} · {scoreInterpretation(scored.final)}
        </span>
      </div>

      {topPro ? (
        <p className="m-0 mb-2.5 flex items-start gap-1.5 text-sm leading-relaxed text-text">
          <IconThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trust-high" />
          {topPro}
        </p>
      ) : null}

      <div className="mb-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-text-sub">
        <span className="inline-flex items-center gap-1">
          <IconTransit className="h-3.5 w-3.5" /> {scored.travelMinutes}분
        </span>
        <span className="inline-flex items-center gap-1">
          <IconPrice className="h-3.5 w-3.5" /> {c.priceAdult.toLocaleString('ko-KR')}원
        </span>
        <span>{trustSummary}</span>
      </div>

      <Link
        href={`/cinemas/${c.auditorium.id}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >
        상세 보기 →
      </Link>

      <DetailPanel scored={scored} restPros={restPros} />

      {runId ? <FeedbackWidget runId={runId} showtimeId={c.showtimeId} /> : null}
    </article>
  );
}

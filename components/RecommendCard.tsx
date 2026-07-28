import Link from 'next/link';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';
import { FeedbackWidget } from './FeedbackWidget';
import { FormatTag } from './FormatTag';
import { IconNote, IconPrice, IconQuestion, IconSeat, IconThumbsDown, IconThumbsUp, IconTransit, IconWrench } from './Icon';
import { ShowtimeStatusBadge } from './StatusBadge';
import { TrackedExternalLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const PICK_DESC: Record<PickLabel, string> = {
  균형: '가장 균형 잡힌 선택',
  품질: '영상·음향 품질 우선',
  '근접·가성비': '이동·편의 우선',
};

const CONFIDENCE_CLS: Record<string, string> = {
  높음: 'border-trust-high/40 text-trust-high',
  보통: 'border-trust-mid/40 text-trust-mid',
  낮음: 'border-trust-low/40 text-trust-low',
};

const pct = (x: number) => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-sub">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

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
  const spec = c.auditorium.spec;
  const confCls = CONFIDENCE_CLS[scored.confidenceLabel] ?? CONFIDENCE_CLS['낮음'];
  const isTop = rank === 1;

  return (
    <article
      className={`rounded-card-lg border bg-surface p-4 ${
        isTop ? 'border-primary shadow-highlight' : 'border-border shadow-card'
      }`}
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <p className="m-0 flex items-center gap-1.5 text-sm text-text-sub">
        {isTop ? (
          <span className="inline-flex items-center rounded-full bg-primary-strong px-2 py-0.5 text-[11px] font-bold text-white">
            가장 잘 맞아요
          </span>
        ) : null}
        {rank}순위 · {PICK_DESC[label]}
      </p>
      <h3 id={`pick-${rank}-title`} className="m-0 mb-2 mt-1 text-lg font-bold text-text">
        <Link
          href={`/cinemas/${c.auditorium.id}`}
          className="text-text underline decoration-border underline-offset-4 hover:decoration-primary"
        >
          {c.location.name} {c.auditorium.no}
        </Link>{' '}
        · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <FormatTag format={c.format} />
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-sub">
          종합 {pct(scored.final)}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${confCls}`}>
          확신도 {scored.confidenceLabel}
        </span>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-sub">
        <span className="inline-flex items-center gap-1">
          <IconTransit className="h-4 w-4" /> 이동 약 {scored.travelMinutes}분(추정)
        </span>
        <span className="inline-flex items-center gap-1">
          <IconPrice className="h-4 w-4" /> {c.priceAdult.toLocaleString('ko-KR')}원
        </span>
        <span className="inline-flex items-center gap-1">
          <IconSeat className="h-4 w-4" /> {scored.seatZone.zone} <span>({scored.seatZone.label})</span>
        </span>
      </div>

      <div className="flex flex-col gap-2 text-[15px] text-text">
        {scored.pros.length > 0 ? (
          <div>
            <h4 className="m-0 mb-1 text-xs font-bold text-text-sub">잘 맞는 이유</h4>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {scored.pros.slice(0, 3).map((p) => (
                <li key={p} className="flex items-start gap-1.5">
                  <IconThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-trust-high" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {scored.cons.length > 0 ? (
          <div>
            <h4 className="m-0 mb-1 text-xs font-bold text-text-sub">고려할 점</h4>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {scored.cons.slice(0, 2).map((n) => (
                <li key={n} className="flex items-start gap-1.5">
                  <IconThumbsDown className="mt-0.5 h-4 w-4 shrink-0 text-trust-mid" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {scored.uncertainties.length > 0 ? (
          <div>
            <h4 className="m-0 mb-1 text-xs font-bold text-text-sub">확인 필요</h4>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {scored.uncertainties.slice(0, 2).map((u) => (
                <li key={u} className="flex items-start gap-1.5">
                  <IconQuestion className="mt-0.5 h-4 w-4 shrink-0 text-text-sub" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-sub">
        <span>상영관 정보 확인일 {spec ? spec.observedAt.slice(0, 10) : '정보 없음'}</span>
        {spec ? <TrustBadge status={spec.infoStatus} /> : null}
        <span>· 회차 확인일 {(c.verifiedAt ?? c.dataCheckedAt).slice(0, 10)}</span>
        <ShowtimeStatusBadge kind={c.isSynthetic ? 'synthetic' : 'verified'} />
      </p>

      {c.bookingUrl && !c.isSynthetic ? (
        <p className="mt-2.5">
          <TrackedExternalLink
            event="booking_link_clicked"
            eventProperties={{ showtimeId: c.showtimeId }}
            className="flex min-h-11 w-full items-center justify-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-strong-hover"
            href={c.bookingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            공식 예매 페이지로 이동 ↗
          </TrackedExternalLink>
        </p>
      ) : null}

      <details className="mt-3 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
          점수는 어떻게 계산되나요?
        </summary>
        <p className="mb-2 text-sm text-text-sub">
          아래 항목들을 종합해서 계산한 점수예요. 영화의 절대적인 품질이 아니라{' '}
          <strong className="font-semibold text-text">지금 입력한 조건에서만</strong> 상대적으로
          얼마나 잘 맞는지를 나타내요.
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
        {spec?.renewalEvent ? (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-text-sub">
            <IconWrench className="mt-0.5 h-4 w-4 shrink-0" /> {spec.renewalEvent}
          </p>
        ) : null}
        {spec?.notes ? (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-text-sub">
            <IconNote className="mt-0.5 h-4 w-4 shrink-0" /> {spec.notes}
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
                <a className="text-primary" href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
                  {cit.sourceName}
                </a>
              ) : (
                <span>{cit.sourceName === '출처 없음' ? '출처 없음' : cit.sourceName}</span>
              )}
              <TrustBadge status={cit.infoStatus} observedAt={cit.observedAt} />
            </li>
          ))}
        </ul>
      </details>

      {runId ? <FeedbackWidget runId={runId} showtimeId={c.showtimeId} /> : null}
    </article>
  );
}

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

/**
 * 결과 페이지 정보 밀도 축소(2026-07-30) — 이전에는 잘 맞는 이유(최대 3)·고려할 점(최대 2)·
 * 확인 필요(최대 2)를 전부 카드에 항상 펼쳐 보여줘서, 카드 하나가 최대 7줄짜리 불릿 목록
 * 3개를 항상 보여주고 있었다("너무 글자 개많아서 읽기 힘들어" 피드백). 기본으로는 가장 강한
 * 이유 한 줄만 보여주고, 나머지(고려할 점·확인 필요·전체 이유·점수 계산 근거)는 전부
 * "자세히 보기" 안으로 옮겼다 — 데이터를 지운 게 아니라 기본 화면 밖으로 옮긴 것뿐이다.
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
  const spec = c.auditorium.spec;
  const confCls = CONFIDENCE_CLS[scored.confidenceLabel] ?? CONFIDENCE_CLS['낮음'];
  const isTop = rank === 1;
  const [topPro, ...restPros] = scored.pros;
  const hasMoreDetail = restPros.length > 0 || scored.cons.length > 0 || scored.uncertainties.length > 0;

  return (
    <article
      className={`rounded-card-xl border bg-surface p-5 ${
        isTop ? 'border-primary shadow-highlight' : 'border-border shadow-card'
      }`}
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <p className="m-0 flex items-center gap-1.5 text-sm text-text-sub">
        {isTop ? (
          <span className="inline-flex items-center rounded-full bg-primary-strong px-2.5 py-0.5 text-[11px] font-bold text-white">
            가장 잘 맞아요
          </span>
        ) : null}
        {rank}순위 · {PICK_DESC[label]}
      </p>
      <h3 id={`pick-${rank}-title`} className="font-wanted m-0 mb-2.5 mt-1.5 text-xl font-bold tracking-[-0.01em] text-text">
        <Link
          href={`/cinemas/${c.auditorium.id}`}
          className="text-text underline decoration-border underline-offset-4 hover:decoration-primary"
        >
          {c.location.name} {c.auditorium.no}
        </Link>{' '}
        · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FormatTag format={c.format} />
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-sub">
          종합 {pct(scored.final)}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${confCls}`}>
          확신도 {scored.confidenceLabel}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-sub">
        <span className="inline-flex items-center gap-1.5">
          <IconTransit className="h-4 w-4" /> 이동 약 {scored.travelMinutes}분(추정)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconPrice className="h-4 w-4" /> {c.priceAdult.toLocaleString('ko-KR')}원
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconSeat className="h-4 w-4" /> {scored.seatZone.zone} <span>({scored.seatZone.label})</span>
        </span>
      </div>

      {topPro ? (
        <p className="m-0 mb-3 flex items-start gap-2 text-[15px] leading-relaxed text-text">
          <IconThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-trust-high" />
          {topPro}
        </p>
      ) : null}

      {c.bookingUrl && !c.isSynthetic ? (
        <p className="m-0 mb-3">
          <TrackedExternalLink
            event="booking_link_clicked"
            eventProperties={{ showtimeId: c.showtimeId }}
            className="flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-strong-hover"
            href={c.bookingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            공식 예매 페이지로 이동 ↗
          </TrackedExternalLink>
        </p>
      ) : null}

      <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-sub">
        <span>정보 확인일 {spec ? spec.observedAt.slice(0, 10) : '없음'}</span>
        {spec ? <TrustBadge status={spec.infoStatus} /> : null}
        <ShowtimeStatusBadge kind={c.isSynthetic ? 'synthetic' : 'verified'} />
      </p>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
          {hasMoreDetail ? '더 자세히 보기 (이유·고려할 점·점수 계산)' : '점수는 어떻게 계산되나요?'}
        </summary>

        {restPros.length > 0 || scored.cons.length > 0 || scored.uncertainties.length > 0 ? (
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

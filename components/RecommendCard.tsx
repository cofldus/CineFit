import Link from 'next/link';
import type { PickLabel, RecommendationRequest, ScoredCandidate } from '../src/domain/recommendation/types';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import { categorizeReason, citationsTrustSummary, coreConditionsSummary, pct, REASON_CATEGORY_LABEL } from '../src/lib/display';
import { IconArrowRight, IconNote, IconQuestion, IconThumbsDown, IconWrench } from './Icon';
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
  '근접·가성비': '거리와 가격을 더 중요하게 본다면',
};

function ReasonBlock({ reason, tone }: { reason: string; tone: 'hero' | 'plain' }) {
  const label = REASON_CATEGORY_LABEL[categorizeReason(reason)];
  return (
    <div>
      <p className={`m-0 text-[12.5px] font-semibold uppercase tracking-wide ${tone === 'hero' ? 'text-hero-text-sub' : 'text-text-tertiary'}`}>
        {label}
      </p>
      <p className={`m-0 mt-1 text-[15.5px] leading-relaxed ${tone === 'hero' ? 'text-hero-text' : 'text-text'}`}>{reason}</p>
    </div>
  );
}

function DetailPanel({
  scored,
  restPros,
  tone,
}: {
  scored: ScoredCandidate;
  restPros: string[];
  tone: 'hero' | 'plain';
}) {
  const hasMore = restPros.length > 0 || scored.cons.length > 0 || scored.uncertainties.length > 0;
  const sub = tone === 'hero' ? 'text-hero-text-sub' : 'text-text-sub';
  const strong = tone === 'hero' ? 'text-hero-text' : 'text-text';
  const border = tone === 'hero' ? 'border-hero-border' : 'border-border';
  const linkCls = tone === 'hero' ? 'text-hero-text hover:underline decoration-hero-border' : 'text-text hover:underline decoration-border';

  return (
    <details className={`mt-5 border-t pt-4 ${border}`}>
      <summary className={`flex min-h-11 cursor-pointer items-center text-[13.5px] font-medium ${linkCls} underline-offset-2`}>
        {hasMore ? '더 자세히 보기 (이유·고려할 점·점수 계산·출처)' : '점수는 어떻게 계산되나요?'}
      </summary>

      {hasMore ? (
        <div className="mt-3 flex flex-col gap-3">
          {restPros.map((r) => (
            <ReasonBlock key={r} reason={r} tone={tone} />
          ))}
          {scored.cons.length > 0 ? (
            <div>
              <h4 className={`m-0 mb-1.5 text-[12.5px] font-bold uppercase tracking-wide ${sub}`}>고려할 점</h4>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {scored.cons.slice(0, 2).map((n) => (
                  <li key={n} className={`flex items-start gap-2 text-sm ${strong}`}>
                    <IconThumbsDown className={`mt-0.5 h-4 w-4 shrink-0 ${sub}`} />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {scored.uncertainties.length > 0 ? (
            <div>
              <h4 className={`m-0 mb-1.5 text-[12.5px] font-bold uppercase tracking-wide ${sub}`}>확인 필요</h4>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {scored.uncertainties.slice(0, 2).map((u) => (
                  <li key={u} className={`flex items-start gap-2 text-sm ${strong}`}>
                    <IconQuestion className={`mt-0.5 h-4 w-4 shrink-0 ${sub}`} />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={`mb-2 mt-4 text-[13px] ${sub}`}>
        아래 항목들을 종합해서 계산한 적합도예요. 영화의 절대적인 품질이 아니라{' '}
        <strong className={`font-semibold ${strong}`}>지금 입력한 조건에서만</strong> 상대적으로 얼마나 잘 맞는지를
        나타내요.
      </p>
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm tabular-nums ${strong}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>종합 적합도</span>
          <span className="font-semibold">{pct(scored.final)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>신뢰 보정</span>
          <span className="font-semibold">{pct(scored.trust)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>포맷 만족도</span>
          <span className="font-semibold">{pct(scored.axes.ffm)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>상영관 품질</span>
          <span className="font-semibold">{pct(scored.axes.audQ)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>시간대 적합도</span>
          <span className="font-semibold">{pct(scored.axes.pm)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={sub}>정보 신뢰도</span>
          <span className="font-semibold">{pct(scored.axes.dc)}</span>
        </div>
      </div>
      {scored.candidate.auditorium.spec?.renewalEvent ? (
        <p className={`mt-2 flex items-start gap-1.5 text-[13px] ${sub}`}>
          <IconWrench className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.renewalEvent}
        </p>
      ) : null}
      {scored.candidate.auditorium.spec?.notes ? (
        <p className={`mt-1 flex items-start gap-1.5 text-[13px] ${sub}`}>
          <IconNote className="mt-0.5 h-4 w-4 shrink-0" /> {scored.candidate.auditorium.spec.notes}
        </p>
      ) : null}
      <p className={`mt-2 text-[13px] ${sub}`}>
        좌석 구역 추천 근거({scored.seatZone.label}): {scored.seatZone.rationale.join(' / ')}
      </p>
      <h4 className={`mb-1 mt-4 text-[12.5px] font-bold uppercase tracking-wide ${sub}`}>이 추천에 사용된 출처</h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
        {scored.citations.map((cit, i) => (
          <li key={`${cit.what}-${i}`} className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${sub}`}>
            <span>{cit.what}</span>
            {cit.sourceUrl ? (
              <a className={linkCls} href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
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
 * 결과 페이지 — "Projector Editorial" 개편. 대표 추천만 어두운 시네마 표면(hero)을 쓰고
 * 나머지는 전부 밝은 표면이다. 카드 내부에 세로 구분선을 넣지 않고 상단(정체성) → 중앙
 * (이유) → 하단(숫자+CTA) 3단 스택으로 구성한다. 이유는 초록 체크 아이콘 목록이 아니라
 * 화면/상영관/좌석/이동 라벨 + 문장의 타이포그래피 쌍으로 보여준다. 대안 카드는 순위별로
 * 다른 강조색을 쓰지 않고 완전히 같은 스타일 — 목적 문장으로만 구분한다.
 */
export function RecommendCard({
  rank,
  label,
  scored,
  request,
}: {
  rank: number;
  label: PickLabel;
  scored: ScoredCandidate;
  /** "핵심 조건 N개 충족" 계산에 쓰는 사용자의 실제 입력 조건 */
  request: RecommendationRequest;
}) {
  const { candidate: c } = scored;
  const isTop = rank === 1;
  const trustSummary = citationsTrustSummary(scored.citations);
  const conditionsLine = coreConditionsSummary(scored, request);
  const formatLabel = FORMAT_LABELS[c.format] ?? c.format;

  if (isTop) {
    const [reason1, reason2, reason3, ...restPros] = scored.pros;
    const reasons = [reason1, reason2, reason3].filter((r): r is string => Boolean(r));

    return (
      <article
        className="rounded-card-xl bg-hero p-5 shadow-glow-primary transition-shadow duration-300 sm:p-9"
        aria-labelledby={`pick-${rank}-title`}
        data-testid={`pick-${label}`}
      >
        <p className="m-0 text-[13px] font-semibold uppercase tracking-wide text-hero-text-sub">가장 잘 맞는 선택</p>
        <h2
          id={`pick-${rank}-title`}
          className="font-wanted m-0 mt-2 text-2xl font-bold tracking-[-0.01em] text-hero-text sm:text-[28px]"
        >
          {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
        </h2>

        {reasons.length > 0 ? (
          <div className="mt-6 flex flex-col gap-4 sm:mt-7">
            {reasons.map((r) => (
              <ReasonBlock key={r} reason={r} tone="hero" />
            ))}
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hero-border pt-5 text-[14px] font-medium text-hero-text-sub">
          <span>추천 좌석 {scored.seatZone.zone}</span>
          <span>이동 {scored.travelMinutes}분(추정)</span>
          <span className="tabular-nums">{c.priceAdult.toLocaleString('ko-KR')}원</span>
          <span>{formatLabel}</span>
          <span>{conditionsLine}</span>
          <span>정보 {trustSummary}</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/cinemas/${c.auditorium.id}`}
            className="group/cta flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-7 text-[15.5px] font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.99]"
          >
            상영관 상세 보기
            <IconArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
          </Link>
          {c.bookingUrl && !c.isSynthetic ? (
            <TrackedExternalLink
              event="booking_link_clicked"
              eventProperties={{ showtimeId: c.showtimeId }}
              className="inline-flex min-h-9 items-center text-[13.5px] font-medium text-hero-text hover:underline decoration-hero-border underline-offset-2"
              href={c.bookingUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              공식 예매 페이지로 이동 ↗
            </TrackedExternalLink>
          ) : null}
        </div>

        <DetailPanel scored={scored} restPros={restPros} tone="hero" />
      </article>
    );
  }

  const [topPro, ...restPros] = scored.pros;

  return (
    <article
      className="rounded-card-lg border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 text-sm text-text-sub">{PICK_SCENARIO[label]}</p>
        <span className="shrink-0 text-[12px] font-medium text-text-tertiary">{rank}순위</span>
      </div>
      <h3 id={`pick-${rank}-title`} className="font-wanted m-0 mb-3 mt-1 text-lg font-bold tracking-[-0.01em] text-text">
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      {topPro ? <ReasonBlock reason={topPro} tone="plain" /> : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-medium text-text-sub">
        <span>이동 {scored.travelMinutes}분</span>
        <span className="tabular-nums">{c.priceAdult.toLocaleString('ko-KR')}원</span>
      </div>

      <Link
        href={`/cinemas/${c.auditorium.id}`}
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-text hover:underline decoration-border-strong underline-offset-2"
      >
        상세 보기 →
      </Link>

      <DetailPanel scored={scored} restPros={restPros} tone="plain" />
    </article>
  );
}

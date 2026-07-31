import Link from 'next/link';
import type { FormatId, PickLabel, RecommendationRequest, ScoredCandidate } from '../src/domain/recommendation/types';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import { categorizeReason, citationsTrustSummary, coreConditionsSummary, pct, REASON_CATEGORY_LABEL } from '../src/lib/display';
import { IconArrowRight, IconCheckCircle, IconFilm, IconNote, IconPrice, IconQuestion, IconThumbsDown, IconTransit, IconWrench } from './Icon';
import { TrackedExternalLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

// 카드 제목만 보고도 대안이 어떤 상황에 맞는 선택인지 구분되도록 — PickLabel(데이터 값)은
// 그대로 두고 화면 표시 문구만 상황 서술형으로 바꿨다. 1위와의 실제 차이(diffVsTop)를 계산할
// 수 없거나 차이가 없을 때의 대체 문구로도 쓴다.
const PICK_SCENARIO: Record<PickLabel, string> = {
  균형: '가장 균형 잡힌 선택',
  품질: '화질과 사운드를 더 중요하게 본다면',
  '근접·가성비': '거리와 가격을 더 중요하게 본다면',
};

const PREMIUM_FORMATS = new Set<FormatId>(['imax', 'dolby_cinema']);

// 2·3위 카드 제목에 붙는 "1위와의 핵심 차이" — 이미 계산된 가격·이동시간·포맷 값만 비교해
// 만든 문장이다(새 수치를 만들지 않음). 장점 1개 + 트레이드오프 1개가 모두 있으면
// "…지만 …" 형태로 잇는다.
function diffVsTop(scored: ScoredCandidate, top: ScoredCandidate): string | null {
  const c = scored.candidate;
  const t = top.candidate;
  const pros: string[] = [];
  const cons: string[] = [];

  const priceDiff = t.priceAdult - c.priceAdult;
  if (priceDiff > 0) pros.push(`${priceDiff.toLocaleString('ko-KR')}원 저렴`);
  else if (priceDiff < 0) cons.push(`${Math.abs(priceDiff).toLocaleString('ko-KR')}원 비쌈`);

  const travelDiff = scored.travelMinutes - top.travelMinutes;
  if (travelDiff < 0) pros.push(`이동 ${Math.abs(travelDiff)}분 짧음`);
  else if (travelDiff > 0) cons.push(`이동 ${travelDiff}분 더`);

  if (c.format !== t.format) {
    if (PREMIUM_FORMATS.has(t.format) && !PREMIUM_FORMATS.has(c.format)) {
      cons.push(`${FORMAT_LABELS[t.format] ?? t.format} 아님`);
    } else if (PREMIUM_FORMATS.has(c.format) && !PREMIUM_FORMATS.has(t.format)) {
      pros.push(`${FORMAT_LABELS[c.format] ?? c.format} 상영`);
    }
  }

  if (pros.length > 0 && cons.length > 0) return `${pros[0]}지만 ${cons[0]}`;
  if (pros.length > 0) return pros.slice(0, 2).join(' · ');
  if (cons.length > 0) return cons.slice(0, 2).join(' · ');
  return null;
}

// 대표 카드의 축별 게이지 — 의미가 불분명한 종합 퍼센트 하나 대신, 엔진이 실제로 계산한
// 축 값(audQ·seatQ·conv·pv)을 각각 라벨과 함께 보여준다. value는 항상 0~1의 실제 축 점수,
// detail은 그 축의 구체 사실(이동 분·가격 원)이 있으면 대신 표기한다.
function AxisBar({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const width = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-hero-text-sub">{label}</span>
        <span className="font-mono text-[13px] font-bold tabular-nums text-hero-text">{detail ?? `${width}%`}</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-hero-soft">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-strong" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// 추천 좌석 구역 문구(예: "중앙 블록")를 미니 좌석 그리드의 대략적 강조 위치로 옮기는
// 키워드 휴리스틱 — 정확한 좌석 좌표 데이터는 없으므로(존은 문구로만 존재) 위치는 개략이고,
// 정확한 정보는 함께 표기되는 문구·"추정" 라벨이 담당한다.
function seatHighlight(zone: string): { rows: [number, number]; cols: [number, number] } {
  const rows: [number, number] =
    zone.includes('후') || zone.includes('뒤') ? [3, 4] : zone.includes('전') || zone.includes('앞') ? [0, 1] : [1, 3];
  const cols: [number, number] = zone.includes('좌') ? [0, 4] : zone.includes('우') ? [7, 11] : [4, 7];
  return { rows, cols };
}

function MiniSeatMap({ zone }: { zone: string }) {
  const { rows, cols } = seatHighlight(zone);
  return (
    <div aria-hidden className="flex w-full flex-col items-center gap-[4px]">
      <div className="h-px w-[70%] rounded-full bg-accent/60" />
      {Array.from({ length: 5 }, (_, r) => (
        <div key={r} className="flex justify-center gap-[4px]" style={{ width: `${72 + r * 7}%` }}>
          {Array.from({ length: 12 }, (_, c) => {
            const on = r >= rows[0] && r <= rows[1] && c >= cols[0] && c <= cols[1];
            return (
              <span
                key={c}
                className={`h-[6px] flex-1 rounded-[2px] ${on ? 'bg-gradient-to-b from-primary to-primary-strong' : 'bg-hero-soft'}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ReasonBlock({ reason, tone }: { reason: string; tone: 'hero' | 'plain' }) {
  const label = REASON_CATEGORY_LABEL[categorizeReason(reason)];
  return (
    <div>
      <p className={`m-0 text-[12.5px] font-semibold uppercase tracking-wide ${tone === 'hero' ? 'text-hero-text-sub' : 'text-text-sub'}`}>
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
  const linkCls = tone === 'hero' ? 'text-hero-text decoration-hero-border' : 'text-text decoration-border-strong';

  return (
    <details className={`mt-5 border-t pt-4 ${border}`}>
      <summary className={`flex min-h-11 cursor-pointer items-center text-[13.5px] font-medium hover:underline ${linkCls} underline-offset-2`}>
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
              <a className={`hover:underline ${linkCls}`} href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
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
 * 결과 페이지 — "Cinematic Tech" 개편(11차). 페이지 전체가 홈과 같은 다크 시네마 스코프가
 * 되면서, 대표 카드는 더 이상 "밝은 페이지 위 유일한 다크 카드"가 아니라 페이지의
 * 클라이맥스 무대다: 상영관 이름·시각이 디스플레이 서체로 가장 크게, 종합 퍼센트 막대 대신
 * 엔진의 실제 축 값 4개(화면·음향/좌석/이동/가격)를 각각 게이지로, 영화의 실제 화면비를 가진
 * 스크린 그래픽과 추천 구역이 강조된 미니 좌석 맵을 시그니처 비주얼로 보여준다. 대안 카드는
 * 같은 항목을 같은 위치에 배치하고, 제목 자리에 1위와의 실제 차이("4,000원 저렴하지만 이동
 * 2분 더")를 계산해 표시한다.
 */
export function RecommendCard({
  rank,
  label,
  scored,
  request,
  top,
  nativeAr,
}: {
  rank: number;
  label: PickLabel;
  scored: ScoredCandidate;
  /** "핵심 조건 N개 충족" 계산에 쓰는 사용자의 실제 입력 조건 */
  request: RecommendationRequest;
  /** 1위 후보 — 2·3위 카드가 "1위와의 차이"를 계산할 때만 전달 */
  top?: ScoredCandidate;
  /** 영화의 실제 기본 화면비(native_ar) — 대표 카드 스크린 그래픽에만 사용 */
  nativeAr?: number | null;
}) {
  const { candidate: c } = scored;
  const isTop = rank === 1;
  const trustSummary = citationsTrustSummary(scored.citations);
  const conditionsLine = coreConditionsSummary(scored, request);
  const formatLabel = FORMAT_LABELS[c.format] ?? c.format;

  if (isTop) {
    const [reason1, reason2, ...restPros] = scored.pros;
    const reasons = [reason1, reason2].filter((r): r is string => Boolean(r));

    return (
      <article
        className="relative overflow-hidden rounded-card-xl bg-hero p-6 shadow-glow-primary transition-shadow duration-300 sm:p-8"
        aria-labelledby={`pick-${rank}-title`}
        data-testid={`pick-${label}`}
      >
        {/* 카드 상단의 얇은 와인→로즈 트림 — 텍스트가 아니라 장식 선이라 대비 요건과 무관. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, #872b42, #bc6076)' }}
        />
        <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">가장 잘 맞는 선택</p>
        <h2
          id={`pick-${rank}-title`}
          className="m-0 mt-2.5 text-balance font-headline text-[27px] font-extrabold leading-[1.15] tracking-[-0.02em] text-hero-text sm:text-[36px]"
        >
          {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
        </h2>

        {/* 시그니처 비주얼 — 왼쪽: 영화의 실제 화면비 스크린 + 추천 구역 미니 좌석 맵,
            오른쪽: 엔진 축 값 4개 게이지. 종합 퍼센트는 전면에 노출하지 않는다(상세 패널에만). */}
        <div className="mt-6 grid gap-6 border-t border-hero-border pt-5 sm:grid-cols-[250px,1fr] sm:items-center sm:gap-10">
          <div className="mx-auto flex w-full max-w-[250px] flex-col items-center">
            {nativeAr ? (
              <>
                <div
                  aria-hidden
                  className="flex w-full items-center justify-center rounded-t-[10px] rounded-b-[3px] border border-hero-border border-t-2 border-t-accent bg-gradient-to-b from-hero-soft to-transparent"
                  style={{ aspectRatio: `${nativeAr} / 1` }}
                >
                  <span className="font-mono text-[16px] font-bold tracking-[0.08em] text-hero-text">
                    {nativeAr.toFixed(2)}:1
                  </span>
                </div>
                <p aria-hidden className="m-0 mb-3 mt-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-hero-text-sub">
                  Screen
                </p>
              </>
            ) : null}
            <MiniSeatMap zone={scored.seatZone.zone} />
            <p className="m-0 mt-2 text-center text-[12px] text-hero-text-sub">
              추천 좌석 {scored.seatZone.zone} · {scored.seatZone.label}
            </p>
          </div>
          <div className="flex flex-col gap-3.5">
            <AxisBar label="화면·음향 품질" value={scored.axes.audQ} />
            <AxisBar label="좌석 적합" value={scored.axes.seatQ} />
            <AxisBar label="이동 편의" value={scored.axes.conv} detail={`${scored.travelMinutes}분`} />
            <AxisBar label="가격 적합" value={scored.axes.pv} detail={`${c.priceAdult.toLocaleString('ko-KR')}원`} />
          </div>
        </div>

        {reasons.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-hero-border pt-5">
            {reasons.map((r) => (
              <ReasonBlock key={r} reason={r} tone="hero" />
            ))}
          </div>
        ) : null}

        {/* 이동·가격·포맷·충족 조건 — 아이콘형 데이터 행 */}
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hero-border pt-5 sm:grid-cols-4">
          <div className="flex items-start gap-2">
            <IconTransit aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hero-text-sub" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">이동 시간</span>
              <span className="tabular-nums text-[15px] font-semibold text-hero-text">{scored.travelMinutes}분(추정)</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconPrice aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hero-text-sub" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">가격</span>
              <span className="tabular-nums text-[15px] font-semibold text-hero-text">{c.priceAdult.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconFilm aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hero-text-sub" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">포맷</span>
              <span className="text-[15px] font-semibold text-hero-text">{formatLabel}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconCheckCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-hero-text-sub" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">충족 조건</span>
              <span className="text-[15px] font-semibold text-hero-text">{conditionsLine}</span>
            </div>
          </div>
        </div>
        <p className="m-0 mt-3 text-[13px] text-hero-text-sub">정보 {trustSummary}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/cinemas/${c.auditorium.id}`}
            className="group/cta flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.99]"
          >
            상영관 상세 보기
            <IconArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
          </Link>
          {c.bookingUrl && !c.isSynthetic ? (
            <TrackedExternalLink
              event="booking_link_clicked"
              eventProperties={{ showtimeId: c.showtimeId }}
              className="inline-flex min-h-9 items-center text-[13.5px] font-medium text-hero-text decoration-hero-border hover:underline underline-offset-2"
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
  const diff = top ? diffVsTop(scored, top) : null;

  return (
    <article
      className="rounded-card-lg border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 1위와의 실제 차이를 제목 위에 직접 표기 — 카드를 각각 읽지 않아도 차이가 바로
            보이게 한다. 차이를 계산할 수 없으면 상황 서술형 문구로 대체. */}
        <p className="m-0 text-[14px] font-bold text-primary">{diff ?? PICK_SCENARIO[label]}</p>
        <span className="shrink-0 text-[12px] font-medium text-text-tertiary">{rank}순위</span>
      </div>
      <h3 id={`pick-${rank}-title`} className="m-0 mb-3 mt-1.5 text-balance text-lg font-bold text-text">
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      {topPro ? <ReasonBlock reason={topPro} tone="plain" /> : null}

      {/* 대표 카드의 아이콘 데이터 행과 같은 순서(이동 → 가격 → 포맷) — 후보끼리 같은 항목이
          같은 위치에 오도록 맞춘다. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-medium text-text-sub">
        <span className="inline-flex items-center gap-1.5">
          <IconTransit aria-hidden className="h-4 w-4 shrink-0" /> {scored.travelMinutes}분
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <IconPrice aria-hidden className="h-4 w-4 shrink-0" /> {c.priceAdult.toLocaleString('ko-KR')}원
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconFilm aria-hidden className="h-4 w-4 shrink-0" /> {formatLabel}
        </span>
      </div>

      <Link
        href={`/cinemas/${c.auditorium.id}`}
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary decoration-primary hover:underline underline-offset-2"
      >
        상세 보기 →
      </Link>

      <DetailPanel scored={scored} restPros={restPros} tone="plain" />
    </article>
  );
}

import Link from 'next/link';
import type { FormatId, PickLabel, RecommendationRequest, ScoredCandidate } from '../src/domain/recommendation/types';
import { FORMAT_LABELS, VERIFIED_STATUSES } from '../src/domain/recommendation/presets';
import { categorizeReason, citationsTrustSummary, coreConditionsSummary, pct, REASON_CATEGORY_LABEL, winnerVerdict } from '../src/lib/display';
import { IconArrowRight, IconCheckCircle, IconNote, IconQuestion, IconThumbsDown, IconWrench } from './Icon';
import { TrackedExternalLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

// 카드 제목만 보고도 대안이 어떤 상황에 맞는 선택인지 구분되도록 — PickLabel(데이터 값)은
// 그대로 두고 화면 표시 문구만 상황 서술형으로 바꿨다. 1위와의 실제 차이를 계산할 수 없거나
// 차이가 없을 때의 대체 문구로도 쓴다.
const PICK_SCENARIO: Record<PickLabel, string> = {
  균형: '가장 균형 잡힌 선택',
  품질: '화질과 사운드를 더 중요하게 본다면',
  '근접·가성비': '거리와 가격을 더 중요하게 본다면',
};

const PREMIUM_FORMATS = new Set<FormatId>(['imax', 'dolby_cinema']);

// 좌석 정보 신뢰 요약이 1위보다 낮은지 — 이미 붙어 있는 citation 상태만 비교한다.
function seatTrustLower(scored: ScoredCandidate, top: ScoredCandidate): boolean {
  return citationsTrustSummary(scored.citations) === '일부 추정' && citationsTrustSummary(top.citations) === '확인됨';
}

type DiffClause = { jiman: string; end: string; gain: boolean };

// 1위 대비 차이 절(節) 목록 — 이미 계산된 가격·이동시간·포맷·출처 상태만 비교해 만든다
// (새 수치를 만들지 않음). 문장은 "…지만 …요" 형태로 조합한다.
function diffClauses(scored: ScoredCandidate, top: ScoredCandidate): DiffClause[] {
  const c = scored.candidate;
  const t = top.candidate;
  const out: DiffClause[] = [];

  const travelDiff = scored.travelMinutes - top.travelMinutes;
  if (travelDiff < 0) {
    const d = Math.abs(travelDiff);
    out.push({ jiman: `${d}분 더 가깝지만`, end: `이동이 ${d}분 더 짧아요`, gain: true });
  } else if (travelDiff > 0) {
    out.push({ jiman: `이동이 ${travelDiff}분 더 걸리지만`, end: `이동이 ${travelDiff}분 더 걸려요`, gain: false });
  }

  const priceDiff = t.priceAdult - c.priceAdult;
  if (priceDiff > 0) {
    const won = priceDiff.toLocaleString('ko-KR');
    out.push({ jiman: `${won}원 더 저렴하지만`, end: `${won}원 더 저렴해요`, gain: true });
  } else if (priceDiff < 0) {
    const won = Math.abs(priceDiff).toLocaleString('ko-KR');
    out.push({ jiman: `${won}원 더 비싸지만`, end: `${won}원 더 비싸요`, gain: false });
  }

  if (c.format !== t.format) {
    if (PREMIUM_FORMATS.has(c.format) && !PREMIUM_FORMATS.has(t.format)) {
      const f = FORMAT_LABELS[c.format] ?? c.format;
      out.push({ jiman: `${f}를 볼 수 있지만`, end: `${f}를 볼 수 있어요`, gain: true });
    } else if (PREMIUM_FORMATS.has(t.format) && !PREMIUM_FORMATS.has(c.format)) {
      const f = FORMAT_LABELS[t.format] ?? t.format;
      out.push({ jiman: `${f}는 아니지만`, end: `${f}는 아니에요`, gain: false });
    }
  }

  if (seatTrustLower(scored, top)) {
    out.push({ jiman: '좌석 정보가 일부 추정이지만', end: '좌석 정보가 일부 추정이에요', gain: false });
  }

  return out;
}

// 2·3위 카드의 "1위 대비 한 문장 판단" — 장점 1개 + 트레이드오프 1개가 모두 있으면
// "…지만 …요"로 잇는다. 예: "15분 더 가깝지만 12,000원 더 비싸요".
export function diffVsTop(scored: ScoredCandidate, top: ScoredCandidate): string | null {
  const clauses = diffClauses(scored, top);
  const gains = clauses.filter((c) => c.gain);
  const losses = clauses.filter((c) => !c.gain);
  if (gains.length > 0 && losses.length > 0) return `${gains[0].jiman} ${losses[0].end}`;
  if (gains.length > 0) return gains[0].end;
  if (losses.length > 0) return losses[0].end;
  return null;
}

// 0~100 적합도 전용 5단계 세그먼트 미터(R14 §9C) — 카드 폭 전체를 가로지르는 긴 진행
// 막대를 대체한다. 단위가 다른 이동·가격에는 쓰지 않는다(그쪽은 delta 텍스트).
function SegMeter({ label, value }: { label: string; value: number }) {
  const v = Math.min(1, Math.max(0, value)) * 5;
  const phrase = value >= 0.8 ? '우수' : value >= 0.6 ? '좋음' : value >= 0.4 ? '보통' : '낮음';
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-semibold text-hero-text-sub">{label}</span>
      <span className="flex items-center gap-2.5">
        <span className="seg-meter w-[110px]" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} data-on={v >= i + 0.75 ? 'true' : v >= i + 0.25 ? 'half' : undefined} />
          ))}
        </span>
        <span className="whitespace-nowrap text-[13.5px] tabular-nums text-hero-text">
          <strong className="font-semibold">{pct(value)}</strong>
          <span className="ml-1 text-[12px] text-hero-text-sub">{phrase}</span>
        </span>
      </span>
    </div>
  );
}

// 단위가 있는 값(이동·가격) — 진행률처럼 보이는 막대 대신 실제 숫자 + 기준 대비 여유를
// 문장으로(R14 §9C: "46분 · 기준보다 14분 여유").
function DeltaStat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[13px] font-semibold text-hero-text-sub">{label}</span>
      <span className="text-right">
        <span className="text-[17px] font-semibold tabular-nums text-cream">{value}</span>
        <span className="ml-2 whitespace-nowrap text-[12.5px] text-hero-text-sub">{delta}</span>
      </span>
    </div>
  );
}

// 정보 신뢰도 — 출처 수·확인 비율을 점 밀도로(data-dot-field). 색이 아니라 밀도와 문구가
// 정보를 전달한다.
function TrustDots({ scored }: { scored: ScoredCandidate }) {
  const total = scored.citations.length;
  const verified = scored.citations.filter((c) => VERIFIED_STATUSES.has(c.infoStatus)).length;
  const dots = Math.min(6, total);
  const onDots = total === 0 ? 0 : Math.round((verified / total) * dots);
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-semibold text-hero-text-sub">정보 신뢰도</span>
      <span className="flex items-center gap-2.5">
        <span className="dot-field" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} data-on={i < onDots ? 'true' : undefined} />
          ))}
        </span>
        <span className="whitespace-nowrap text-[13px] tabular-nums text-hero-text">
          출처 {total}건 · {verified === total && total > 0 ? '모두 확인' : `${verified}건 확인`}
        </span>
      </span>
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

// 좌석 개략도(R14 §5-2) — 단일 핑크 덩어리가 아니라 중심에서 주변으로 강도가 낮아지는
// heat field. 앞줄(스크린 쪽)은 좌석이 조금 작고 어둡게(원근감). 핵심 셀만 점등 애니메이션.
function MiniSeatMap({ zone }: { zone: string }) {
  const { rows, cols } = seatHighlight(zone);
  const r0 = (rows[0] + rows[1]) / 2;
  const c0 = (cols[0] + cols[1]) / 2;
  const rSpan = Math.max(1, (rows[1] - rows[0]) / 2 + 1.1);
  const cSpan = Math.max(1, (cols[1] - cols[0]) / 2 + 1.4);
  return (
    <div aria-hidden className="flex w-full flex-col items-center gap-[4px]">
      <div className="h-px w-[70%] rounded-full bg-[#bc6076]/60" />
      {Array.from({ length: 5 }, (_, r) => (
        <div key={r} className="flex justify-center gap-[4px]" style={{ width: `${72 + r * 7}%` }}>
          {Array.from({ length: 12 }, (_, c) => {
            const d = Math.sqrt(((r - r0) / rSpan) ** 2 + ((c - c0) / cSpan) ** 2);
            const heat = Math.max(0, 1 - d);
            const core = heat > 0.55;
            return (
              <span
                key={c}
                className={`flex-1 rounded-[2px] ${core ? 'seat-live' : ''}`}
                style={{
                  height: `${5 + r * 0.6}px`,
                  background:
                    heat > 0.08
                      ? `color-mix(in oklab, var(--primary) ${Math.round(22 + heat * 78)}%, var(--hero-soft))`
                      : 'var(--hero-soft)',
                  opacity: heat > 0.08 ? undefined : 0.55 + r * 0.09,
                  animationDelay: core ? `${Math.round(d * 260)}ms` : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ReasonBlock({ reason, tone, showLabel = true }: { reason: string; tone: 'hero' | 'plain'; showLabel?: boolean }) {
  const label = REASON_CATEGORY_LABEL[categorizeReason(reason)];
  return (
    <div>
      {showLabel ? (
        <p className={`m-0 text-[12.5px] font-semibold uppercase tracking-wide ${tone === 'hero' ? 'text-hero-text-sub' : 'text-text-sub'}`}>
          {label}
        </p>
      ) : null}
      <p className={`m-0 ${showLabel ? 'mt-1' : 'mt-0.5'} text-[15px] leading-relaxed ${tone === 'hero' ? 'text-hero-text' : 'text-text'}`}>{reason}</p>
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

// 스크린 외곽 프레임은 극장 마스킹 원리대로 항상 2.39:1로 고정하고, 영화의 실제 화면비만큼만
// 안쪽이 켜진다(비율 차이가 즉각 체감되는 방식 — 홈·영화 카드와 같은 문법).
const RATIO_ENVELOPE = 2.39;

/**
 * 결과 페이지 대표·대안 카드(R14 §9). 대표 카드는 데스크톱에서 좌(이름·결론·화면비/좌석
 * 시각화) / 우(얻는 것·포기하는 것·핵심 수치·신뢰도)의 2열 구성이고, 컨테이너 쿼리로 카드
 * "자신의" 너비에 따라 접힌다. 긴 수평 진행 막대는 전부 제거 — 0~100 적합도 두 개만 5단계
 * 세그먼트 미터, 이동·가격은 기준 대비 여유 문장, 신뢰도는 출처 점 밀도로 표현한다.
 * 대안 카드는 같은 항목이 같은 위치에 오는 "1위 대비" 구조화 비교 행 + 한 문장 판단.
 */
export function RecommendCard({
  rank,
  label,
  scored,
  request,
  top,
  nativeAr,
  nativeArStatus,
  personality,
}: {
  rank: number;
  label: PickLabel;
  scored: ScoredCandidate;
  /** 핵심 수치의 "기준 대비 여유" 계산에 쓰는 사용자의 실제 입력 조건 */
  request: RecommendationRequest;
  /** 1위 후보 — 2·3위 카드가 "1위와의 차이"를 계산할 때만 전달 */
  top?: ScoredCandidate;
  /** 영화의 실제 기본 화면비(native_ar) — 대표 카드 스크린 그래픽에만 사용 */
  nativeAr?: number | null;
  /** native_ar 값의 확인 상태 라벨("공식 확인"/"추정" 등) — 화면비 시각화 캡션용 */
  nativeArStatus?: string | null;
  /** 전체 픽 중 단독 최댓값/최솟값일 때만 부여되는 성격 배지("가장 저렴" 등) */
  personality?: string | null;
}) {
  const { candidate: c } = scored;
  const isTop = rank === 1;
  const trustSummary = citationsTrustSummary(scored.citations);
  const conditionsLine = coreConditionsSummary(scored, request);
  const formatLabel = FORMAT_LABELS[c.format] ?? c.format;

  if (isTop) {
    const restPros = scored.pros;
    const gains = scored.pros.slice(0, 2);
    const tradeoffs = scored.cons.slice(0, 2);
    const travelSlack = request.maxTravelMinutes - scored.travelMinutes;
    const priceSlack = request.maxPrice - c.priceAdult;

    return (
      <article
        id={`pick-rank-${rank}`}
        className="@container surface-selected relative flex h-full flex-col overflow-hidden rounded-card-xl bg-hero p-6 sm:p-7"
        aria-labelledby={`pick-${rank}-title`}
        data-testid={`pick-${label}`}
      >
        {/* 딥 와인 내부 조명 — 카드 위쪽 모서리에서 옅게 번지는 간접광(장식). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
          style={{ background: 'radial-gradient(ellipse 90% 120% at 20% -20%, rgba(93, 24, 40, 0.45), transparent 70%)' }}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">가장 잘 맞는 선택</p>
          <span className="rounded-full border border-hero-border px-2.5 py-0.5 text-[11.5px] font-semibold text-hero-text-sub">
            {formatLabel}
          </span>
        </div>
        <h2
          id={`pick-${rank}-title`}
          className="m-0 mt-2.5 text-balance font-headline text-[25px] font-bold leading-[1.15] tracking-[-0.02em] text-cream sm:text-[31px]"
        >
          {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
        </h2>
        {/* 왜 이겼는지 한 줄 — 계산된 축 값에서 파생한 요약(새 사실 없음). */}
        <p className="m-0 mt-2.5 max-w-xl text-[15px] leading-relaxed text-hero-text-sub">
          {winnerVerdict(scored, request)}
        </p>

        {/* 우측 레일 높이에 맞춰 카드가 늘어날 때 남는 공간을 시각화 블록 위·아래로 균등
            분배하는 신축 스페이서(공간이 없으면 0). */}
        <div aria-hidden className="mt-auto" />
        {/* 좌: 화면비·좌석 시각화 / 우: 얻는 것·포기하는 것·핵심 수치·신뢰도. 컨테이너 쿼리로
            카드 자신의 너비 기준 2열(@3xl≈768px) ↔ 1열 전환. */}
        <div className="mt-5 grid gap-6 border-t border-hero-border pt-5 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @3xl:gap-10">
          <div className="mx-auto flex w-full max-w-[300px] flex-col items-center @3xl:mx-0">
            {nativeAr ? (
              <>
                {/* 화면비 구분 표시(R15 §6): 영화 비율 / 스크린 기준 비율을 함께 라벨링. */}
                <p className="m-0 mb-1 flex w-full items-baseline justify-between text-[10.5px] tabular-nums text-hero-text-sub">
                  <span>
                    영화 <strong className="font-semibold text-hero-text">{nativeAr.toFixed(2)}:1</strong>
                  </span>
                  <span>스크린 기준 {RATIO_ENVELOPE}:1</span>
                </p>
                <div
                  aria-hidden
                  className="relative flex w-full items-center justify-center overflow-hidden rounded-[8px] border border-white/10 bg-[#0d0b0c]"
                  style={{ aspectRatio: `${RATIO_ENVELOPE} / 1` }}
                >
                  {/* 켜진 화면 — 실제 화면비만큼만. 남는 좌우는 어두운 마스킹(예상 여백). */}
                  <div
                    className="relative flex h-full items-center justify-center overflow-hidden"
                    style={{
                      width: `${(Math.min(nativeAr, RATIO_ENVELOPE) / RATIO_ENVELOPE) * 100}%`,
                      background:
                        'linear-gradient(180deg, rgba(93, 24, 40, 0.4) 0%, rgba(48, 32, 38, 0.95) 60%, rgba(26, 22, 24, 0.97) 100%)',
                    }}
                  >
                    <span
                      className="absolute inset-x-2 top-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.85), transparent)' }}
                    />
                    <span className="whitespace-nowrap text-[15px] font-light tracking-[0.14em] tabular-nums text-hero-text">
                      {nativeAr.toFixed(2)}:1
                    </span>
                  </div>
                  {nativeAr < RATIO_ENVELOPE - 0.05 ? (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8.5px] uppercase tracking-wide text-hero-text-sub/70">
                      여백
                    </span>
                  ) : null}
                </div>
                <p className="m-0 mb-3 mt-1 flex w-full items-baseline justify-between text-[9.5px] text-hero-text-sub">
                  <span aria-hidden className="font-semibold uppercase tracking-[0.25em]">Screen</span>
                  <span>{nativeArStatus ?? '추정'}</span>
                </p>
              </>
            ) : null}
            <MiniSeatMap zone={scored.seatZone.zone} />
            <p className="m-0 mt-2 text-center text-[12.5px] text-hero-text-sub">
              추천 좌석 {scored.seatZone.zone} · {scored.seatZone.label}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* 얻는 것 / 포기하는 것 — 엔진이 이미 계산한 pros/cons에서 그대로. */}
            <div className="grid gap-3 @xl:grid-cols-2">
              {gains.length > 0 ? (
                <div>
                  <p className="m-0 text-[12px] font-bold uppercase tracking-wide text-hero-text-sub">이 선택에서 얻는 것</p>
                  <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
                    {/* 좋은 점/감안할 점은 초록·빨강 대립이 아니라 아이보리·amber 명도 차로
                        구분한다(R15 §6). */}
                    {gains.map((g) => (
                      <li key={g} className="flex items-start gap-1.5 text-[14px] leading-snug text-hero-text">
                        <IconCheckCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cream" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {tradeoffs.length > 0 ? (
                <div>
                  <p className="m-0 text-[12px] font-bold uppercase tracking-wide text-hero-text-sub">감안할 것</p>
                  <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
                    {tradeoffs.map((t) => (
                      <li key={t} className="flex items-start gap-1.5 text-[14px] leading-snug text-hero-text-sub">
                        <IconThumbsDown aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trust-mid" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5 border-t border-hero-border pt-3.5">
              <SegMeter label="화면·음향 품질" value={scored.axes.audQ} />
              <SegMeter label="좌석 적합" value={scored.axes.seatQ} />
              <DeltaStat
                label="이동"
                value={`${scored.travelMinutes}분`}
                delta={travelSlack > 0 ? `기준보다 ${travelSlack}분 여유` : '기준과 같음'}
              />
              <DeltaStat
                label="가격"
                value={`${c.priceAdult.toLocaleString('ko-KR')}원`}
                delta={priceSlack > 0 ? `예산보다 ${priceSlack.toLocaleString('ko-KR')}원 낮음` : '예산과 같음'}
              />
              <TrustDots scored={scored} />
            </div>

            <p className="m-0 flex items-center gap-1.5 text-[13px] text-hero-text-sub">
              <IconCheckCircle aria-hidden className="h-4 w-4 shrink-0" /> {conditionsLine} · 정보 {trustSummary}
            </p>
          </div>
        </div>

        {/* 1위 카드가 우측 레일 높이에 맞춰 늘어날 때 남는 공간은 여기 위에서 흡수 —
            CTA·상세 패널은 항상 카드 하단에 붙는다. */}
        <div className="mt-auto" />
        <div className="mt-5 flex flex-col gap-3 border-t border-hero-border pt-5 sm:flex-row sm:items-center">
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

  const restPros = scored.pros;
  const sentence = top ? diffVsTop(scored, top) : null;

  // 1위 대비 구조화 비교 행 — 후보끼리 같은 항목이 항상 같은 위치에 온다(R14 §9E).
  const rows: { name: string; value: string; delta?: string; gain?: boolean }[] = top
    ? [
        (() => {
          const d = scored.travelMinutes - top.travelMinutes;
          return {
            name: '이동',
            value: `${scored.travelMinutes}분`,
            delta: d === 0 ? '1위와 같음' : d < 0 ? `${Math.abs(d)}분 짧음` : `${d}분 더`,
            gain: d < 0,
          };
        })(),
        (() => {
          const d = scored.candidate.priceAdult - top.candidate.priceAdult;
          return {
            name: '가격',
            value: `${c.priceAdult.toLocaleString('ko-KR')}원`,
            delta:
              d === 0 ? '1위와 같음' : d < 0 ? `${Math.abs(d).toLocaleString('ko-KR')}원 저렴` : `${d.toLocaleString('ko-KR')}원 비쌈`,
            gain: d < 0,
          };
        })(),
        {
          name: '포맷',
          value: formatLabel,
          delta:
            c.format === top.candidate.format
              ? '1위와 같음'
              : `1위는 ${FORMAT_LABELS[top.candidate.format] ?? top.candidate.format}`,
        },
        {
          name: '정보',
          value: trustSummary,
          delta: seatTrustLower(scored, top) ? '1위보다 낮음' : '1위와 비슷',
        },
      ]
    : [];

  return (
    <article
      id={`pick-rank-${rank}`}
      className="edge-sweep flex w-full flex-col rounded-card-lg border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float"
      aria-labelledby={`pick-${rank}-title`}
      data-testid={`pick-${label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {personality ? (
            <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
              {personality}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px] font-medium text-text-tertiary">{rank}순위</span>
      </div>
      <h3 id={`pick-${rank}-title`} className="m-0 mt-1.5 text-balance text-[17.5px] font-bold text-text">
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>
      {/* 1위 대비 한 문장 판단 — 카드의 결론이 먼저 온다. */}
      <p className="m-0 mt-1.5 text-[14.5px] font-semibold leading-snug text-primary">
        {sentence ?? PICK_SCENARIO[label]}
      </p>

      {rows.length > 0 ? (
        <div className="mt-3.5 divide-y divide-border border-t border-border">
          {rows.map((row) => (
            <div key={row.name} className="flex items-baseline justify-between gap-3 py-1.5 text-[13.5px]">
              <span className="shrink-0 font-medium text-text-tertiary">{row.name}</span>
              <span className="flex min-w-0 items-baseline gap-2 text-right">
                <span className="font-semibold tabular-nums text-text">{row.value}</span>
                {row.delta ? (
                  <span className={`whitespace-nowrap text-[12.5px] tabular-nums ${row.gain ? 'text-primary' : 'text-text-sub'}`}>
                    {row.delta}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <Link
        href={`/cinemas/${c.auditorium.id}`}
        className="mt-3.5 inline-flex min-h-11 items-center text-sm font-semibold text-primary decoration-primary hover:underline underline-offset-2"
      >
        상세 보기 →
      </Link>

      {/* 레일에서 카드 높이가 늘어나도 빈 공간이 카드 중간에 뜨지 않게 하단 밀착 */}
      <div className="mt-auto">
        <DetailPanel scored={scored} restPros={restPros} tone="plain" />
      </div>
    </article>
  );
}

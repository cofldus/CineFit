import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';
import { FormatTag } from './FormatTag';
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

export function RecommendCard({
  rank,
  label,
  scored,
}: {
  rank: number;
  label: PickLabel;
  scored: ScoredCandidate;
}) {
  const { candidate: c } = scored;
  const spec = c.auditorium.spec;
  const confCls =
    scored.confidenceLabel === '높음' ? 'badge-high' : scored.confidenceLabel === '보통' ? 'badge-mid' : 'badge-low';

  return (
    <article className="card" aria-labelledby={`pick-${rank}-title`} data-testid={`pick-${label}`}>
      <p className="sub" style={{ margin: 0 }}>
        {rank}순위 · {PICK_DESC[label]}
      </p>
      <h3 id={`pick-${rank}-title`} style={{ margin: '4px 0 8px' }}>
        {c.location.name} {c.auditorium.no} · {timeFmt.format(new Date(c.startsAt))}
      </h3>

      <div className="row" style={{ marginBottom: 8 }}>
        <FormatTag format={c.format} />
        <span className="badge">
          종합 {scored.final.toFixed(3)}
        </span>
        <span className={`badge ${confCls}`}>확신도 {scored.confidenceLabel}</span>
      </div>

      <div className="row sub" style={{ marginBottom: 8 }}>
        <span>🚇 이동 약 {scored.travelMinutes}분(추정)</span>
        <span>💰 {c.priceAdult.toLocaleString('ko-KR')}원</span>
        <span>
          🪑 {scored.seatZone.zone} <em>({scored.seatZone.label})</em>
        </span>
      </div>

      <ul className="plain" style={{ fontSize: 15 }}>
        {scored.pros.slice(0, 3).map((p) => (
          <li key={p} className="pro">
            {p}
          </li>
        ))}
        {scored.cons.slice(0, 2).map((n) => (
          <li key={n} className="con">
            {n}
          </li>
        ))}
        {scored.uncertainties.slice(0, 2).map((u) => (
          <li key={u} className="unc">
            {u}
          </li>
        ))}
      </ul>

      <p className="sub" style={{ margin: '4px 0 0' }}>
        관 사양 확인일 {spec ? spec.observedAt.slice(0, 10) : '정보 없음'}
        {spec ? <TrustBadge status={spec.infoStatus} /> : null} · 회차 확인일{' '}
        {(c.verifiedAt ?? c.dataCheckedAt).slice(0, 10)}{' '}
        {c.isSynthetic ? (
          <span className="badge badge-mid">≈ 검증용 합성 회차</span>
        ) : (
          <span className="badge badge-high">✔ 관리자 확인 회차</span>
        )}
      </p>

      {c.bookingUrl && !c.isSynthetic ? (
        <p style={{ margin: '10px 0 0' }}>
          <a
            className="btn btn-primary btn-block"
            href={c.bookingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            공식 예매 페이지로 이동 ↗
          </a>
        </p>
      ) : null}

      <details className="expand">
        <summary>점수 상세·근거 출처 보기</summary>
        <p className="sub" style={{ marginBottom: 4 }}>
          종합 {scored.final.toFixed(3)} = 기본 {scored.base.toFixed(3)} × 신뢰 보정{' '}
          {scored.trust.toFixed(2)} × 예매 게이트 0.90
        </p>
        <p className="sub">
          포맷 적합 {scored.axes.ffm.toFixed(2)} · 관 품질 {scored.axes.audQ.toFixed(2)} · 회차 적합{' '}
          {scored.axes.pm.toFixed(2)} · 데이터 신뢰도 {scored.axes.dc.toFixed(2)} · 최신성{' '}
          {scored.axes.fr.toFixed(2)}
        </p>
        {spec?.renewalEvent ? <p className="sub">🛠 {spec.renewalEvent}</p> : null}
        {spec?.notes ? <p className="sub">📋 {spec.notes}</p> : null}
        <p className="sub" style={{ marginBottom: 4 }}>
          좌석 구역 추천 근거({scored.seatZone.label}): {scored.seatZone.rationale.join(' / ')}
        </p>
        <h4 style={{ margin: '8px 0 4px', fontSize: 14 }}>이 추천에 사용된 출처</h4>
        <ul className="plain" style={{ fontSize: 13 }}>
          {scored.citations.map((cit, i) => (
            <li key={`${cit.what}-${i}`} className="row">
              <span className="sub">{cit.what}</span>
              {cit.sourceUrl ? (
                <a href={cit.sourceUrl} rel="noopener noreferrer" target="_blank">
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
    </article>
  );
}

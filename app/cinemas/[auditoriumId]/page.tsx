import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormatTag } from '../../../components/FormatTag';
import { Notice } from '../../../components/Notice';
import { TrustBadge } from '../../../components/TrustBadge';
import { cinemaRepository } from '../../../src/data/cinemaRepository';
import { getAppClock } from '../../../src/lib/clock';

export const metadata: Metadata = { title: '상영관 상세' };
export const dynamic = 'force-dynamic';

const dtFmt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const PURPOSE_LABELS: Record<string, string> = {
  immersive: '몰입',
  overview: '전체 시야',
  subtitle: '자막 가독',
  sound: '사운드',
  low_motion: '모션 순함',
  neck_easy: '목 편함',
  exit_easy: '출입 편함',
  pair: '둘이 보기',
  wheelchair: '휠체어',
};

const LIGHT_LABELS: Record<string, string> = { laser: '레이저', xenon: '제논' };
const MASKING_LABELS: Record<string, string> = {
  side: '좌우 마스킹',
  top: '상하 마스킹',
  both: '상하좌우 마스킹',
  none: '마스킹 없음',
  unknown: '마스킹 정보 없음',
};

function SpecRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-text-sub">{label}</span>
      <span className="text-right font-medium text-text">{value}</span>
    </div>
  );
}

export default async function AuditoriumDetailPage({
  params,
}: {
  params: Promise<{ auditoriumId: string }>;
}) {
  const id = Number((await params).auditoriumId);
  const detail = Number.isInteger(id)
    ? await cinemaRepository.getAuditoriumDetail(id, getAppClock().now().toISOString())
    : null;
  if (!detail) notFound();

  const current = detail.specHistory.find((s) => s.validTo === null) ?? detail.specHistory[0] ?? null;
  const history = detail.specHistory.filter((s) => s !== current);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <p className="m-0 text-sm text-text-sub">{detail.location.chain}</p>
      <h1 className="m-0 text-2xl font-extrabold text-text">
        {detail.location.name} {detail.no}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <FormatTag format={detail.brand} />
        {detail.seatCount ? (
          <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-sub">
            {detail.seatCount}석
          </span>
        ) : null}
        {detail.location.status !== 'operating' || detail.status !== 'operating' ? (
          <span className="inline-flex items-center rounded-full border border-trust-low/40 px-2.5 py-0.5 text-xs font-medium text-trust-low">
            운영 상태 확인 필요
          </span>
        ) : null}
      </div>
      {detail.location.transitNote ? (
        <p className="mt-2 text-sm text-text-sub">🚇 {detail.location.transitNote}</p>
      ) : null}
      <p className="mt-3">
        <Link
          href={`/cinemas/${detail.id}/report`}
          className="inline-flex min-h-11 items-center rounded-card border border-border bg-surface px-4 text-sm font-medium text-text hover:border-primary/60"
        >
          ✏️ 정보 수정 제보
        </Link>
      </p>

      {/* 현재 사양 */}
      <section aria-label="현재 사양" className="mt-6">
        <h2 className="text-lg font-bold text-text">현재 사양</h2>
        {current ? (
          <div className="mt-3 rounded-card-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-1.5">
              <SpecRow
                label="영사기"
                value={[
                  LIGHT_LABELS[current.projector?.lightSource ?? ''] ?? current.projector?.lightSource,
                  current.projector?.resolution?.toUpperCase(),
                  current.projector?.dual ? '듀얼' : null,
                  current.projector?.imaxGrade ? `IMAX ${current.projector.imaxGrade}` : null,
                  current.projector?.dolbyVision ? '돌비 비전' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || null}
              />
              <SpecRow
                label="스크린"
                value={[
                  current.screen?.widthM ? `폭 ${current.screen.widthM}m` : null,
                  current.screen?.heightM ? `높이 ${current.screen.heightM}m` : null,
                  current.screen?.aspect ? `비율 ${current.screen.aspect}:1` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '실측 정보 없음'}
              />
              <SpecRow label="사운드" value={current.sound?.format ?? null} />
              <SpecRow
                label="표시 가능한 최대 확장비"
                value={current.supportedAr ? `${current.supportedAr}:1` : '확인 안 됨'}
              />
              <SpecRow label="마스킹" value={MASKING_LABELS[current.masking ?? 'unknown']} />
            </div>
            {current.renewalEvent ? (
              <p className="mb-0 mt-2.5 text-sm text-text-sub">🛠 {current.renewalEvent}</p>
            ) : null}
            {current.notes ? <p className="mb-0 mt-1 text-sm text-text-sub">📋 {current.notes}</p> : null}
            <p className="mb-0 mt-2.5 flex flex-wrap items-center gap-1.5 text-sm text-text-sub">
              <TrustBadge status={current.infoStatus} observedAt={current.observedAt} />
              {current.sourceUrl ? (
                <a className="text-primary" href={current.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {current.sourceName ?? '출처'}
                </a>
              ) : (
                <span>{current.sourceName ?? '출처 없음'}</span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-sub">등록된 사양이 없어요.</p>
        )}
      </section>

      {/* 좌석 존 */}
      <section aria-label="좌석 구역" className="mt-6">
        <h2 className="text-lg font-bold text-text">목적별 좌석 구역</h2>
        <p className="mt-1 text-sm text-text-sub">
          하나의 “명당”이 아니라 목적별 구역으로만 안내해요. 잔여 좌석은 반영되지 않아요.
        </p>
        {detail.seatZones.length === 0 ? (
          <p className="mt-2 text-sm text-text-sub">아직 이 관의 좌석 구역 제보가 없어요.</p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
            {detail.seatZones.map((z, i) => (
              <li key={i} className="rounded-card-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {z.purposes.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-medium text-accent"
                    >
                      {PURPOSE_LABELS[p] ?? p}
                    </span>
                  ))}
                  <span className="font-semibold text-text">
                    {[z.rowRange, z.colRange].filter(Boolean).join(' ')}
                  </span>
                </div>
                {z.rationale ? <p className="mb-0 mt-1.5 text-sm text-text-sub">{z.rationale}</p> : null}
                <p className="mb-0 mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-text-sub">
                  <TrustBadge status={z.infoStatus} observedAt={z.observedAt} />
                  <span>{z.sourceName ?? '출처 없음'}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사양 이력 */}
      {history.length > 0 ? (
        <section aria-label="사양 변경 이력" className="mt-6">
          <h2 className="text-lg font-bold text-text">사양 변경 이력</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
            {history.map((h, i) => (
              <li key={i} className="rounded-card border border-border bg-surface px-4 py-3">
                <span className="text-text-sub">
                  {h.validFrom} ~ {h.validTo ?? '현재'}
                </span>
                {h.renewalEvent ? <span className="ml-2 text-text">{h.renewalEvent}</span> : null}
                <TrustBadge status={h.infoStatus} observedAt={h.observedAt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 근거 기록 */}
      {detail.observations.length > 0 ? (
        <section aria-label="근거 기록" className="mt-6">
          <h2 className="text-lg font-bold text-text">근거 기록</h2>
          <p className="mt-1 text-sm text-text-sub">이 관의 사양 판단에 쓰인 관측 기록이에요.</p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm">
            {detail.observations.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-text-sub">{o.field}</span>
                <span className="font-medium text-text">{String(o.value)}</span>
                <TrustBadge status={o.infoStatus} observedAt={o.observedAt} />
                <span className="text-text-sub">{o.sourceName ?? '출처 없음'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 예정 회차 */}
      <section aria-label="예정 회차" className="mt-6">
        <h2 className="text-lg font-bold text-text">예정 회차</h2>
        {detail.upcomingShowtimes.length === 0 ? (
          <p className="mt-2 text-sm text-text-sub">등록된 예정 회차가 없어요.</p>
        ) : (
          <>
            {detail.upcomingShowtimes.some((s) => s.isSynthetic) ? (
              <div className="mt-2">
                <Notice>
                  “≈” 표시가 있는 회차는 <strong className="font-semibold">검증용 합성 데이터</strong>
                  예요. 실제 예매가 불가능해요.
                </Notice>
              </div>
            ) : null}
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm">
              {detail.upcomingShowtimes.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-card border border-border bg-surface px-4 py-3"
                >
                  <span className="font-semibold text-text">{dtFmt.format(new Date(s.startsAt))}</span>
                  <Link className="text-primary" href={`/recommend/${s.movieId}`}>
                    {s.movieTitle}
                  </Link>
                  <FormatTag format={s.format} />
                  <span className="text-text-sub">{s.priceAdult.toLocaleString('ko-KR')}원</span>
                  {s.isSynthetic ? (
                    <span className="text-xs text-trust-mid">≈ 합성</span>
                  ) : (
                    <span className="text-xs text-trust-high">✔ 관리자 확인</span>
                  )}
                  {s.bookingUrl && !s.isSynthetic ? (
                    <a
                      className="text-primary"
                      href={s.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      예매 ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-6">
        <Link className="text-primary" href="/sources">
          정보 출처·신뢰도 기준 →
        </Link>
      </p>
    </main>
  );
}

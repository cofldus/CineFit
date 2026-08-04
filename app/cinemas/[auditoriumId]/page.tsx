import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormatTag } from '../../../components/FormatTag';
import { IconEdit, IconNote, IconTransit, IconWrench } from '../../../components/Icon';
import { Notice } from '../../../components/Notice';
import { SeatMap } from '../../../components/SeatMap';
import { ShowtimeStatusBadge } from '../../../components/StatusBadge';
import { TrustBadge } from '../../../components/TrustBadge';
import { cinemaRepository } from '../../../src/data/cinemaRepository';
import { getAppClock } from '../../../src/lib/clock';
import { humanizeObservationField, humanizeObservationValue } from '../../../src/lib/observationDisplay';

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

const LIGHT_LABELS: Record<string, string> = { laser: '레이저', xenon: '제논' };
const MASKING_LABELS: Record<string, string> = {
  side: '좌우 마스킹',
  top: '상하 마스킹',
  both: '상하좌우 마스킹',
  none: '마스킹 없음',
  unknown: '마스킹 정보 없음',
};

// 상영관 브랜드(포맷)별 일반적인 관람 적합도 — 실제 사양 데이터를 새로 만들지 않고, 이미
// 저장된 detail.brand(FormatId) 값 하나만으로 만들 수 있는 편집적 설명이다(도메인 상식
// 수준의 문구이며 개별 상영관의 사실을 지어내지 않는다).
const FORMAT_FIT: Record<string, string> = {
  imax: '큰 화면비와 압도적 스케일이 중요한 영화(우주·자연·액션 스펙터클)에 잘 맞아요.',
  dolby_cinema: '명암비와 공간감 있는 사운드가 중요한 영화(어두운 장면이 많은 작품 포함)에 잘 맞아요.',
  '4dx': '모션·효과 연출이 살아나는 액션·어드벤처 영화에 잘 맞아요.',
  superplex: '일반관보다 큰 화면으로 편하게 보고 싶을 때 잘 맞아요.',
  standard: '가격 부담 없이 무난하게 관람하고 싶을 때 잘 맞아요.',
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

  // 모바일 하단 내비게이션과 콘텐츠가 겹치지 않도록 여유 있는 하단 패딩 + safe-area(R15 §7).
  return (
    <main
      className="cinema-scope min-h-dvh max-w-none bg-bg px-4 pt-6"
      style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
    >
      {/* 다크 배경은 main이 전폭으로 채우고, 내용만 아래 래퍼로 제한한다(넓은 화면에서
          밝은 여백이 드러나지 않게). */}
      <div className="mx-auto max-w-wide">
      {/* 1. 상영관 이름·위치·핵심 특징 — 상단 요약을 더 강하게, 줄바꿈이 어색한 지점에서
          끊기지 않도록 관 이름은 통째로 줄바꿈되게 한다. */}
      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">{detail.location.chain}</p>
      <h1 className="type-display m-0 mt-2 text-[30px] sm:text-[36px]">
        {detail.location.name} <span className="whitespace-nowrap">{detail.no}</span>
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FormatTag format={detail.brand} />
        {detail.location.status !== 'operating' || detail.status !== 'operating' ? (
          <span className="inline-flex items-center rounded-full border border-trust-low/40 px-2.5 py-0.5 text-xs font-medium text-trust-low">
            운영 상태 확인 필요
          </span>
        ) : null}
      </div>
      {/* 좌석수·이동 정보를 뱃지가 아니라 하나의 보조 정보 행으로 묶어 포맷 태그와의 위계를
          분명히 한다(포맷이 1순위, 좌석·이동은 2순위 보조 정보). */}
      {detail.seatCount || detail.location.transitNote ? (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-sub">
          {detail.seatCount ? <span className="tabular-nums">{detail.seatCount}석</span> : null}
          {detail.location.transitNote ? (
            <span className="inline-flex items-center gap-1.5">
              <IconTransit className="h-4 w-4 shrink-0" />
              {detail.location.transitNote}
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="mt-3">
        <Link
          href={`/cinemas/${detail.id}/report`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-border bg-surface px-4 text-sm font-medium text-text hover:border-primary/60"
        >
          <IconEdit className="h-4 w-4" /> 정보 수정 제보
        </Link>
      </p>

      {/* 2. 이 상영관이 어떤 관람 목적에 적합한지 */}
      {FORMAT_FIT[detail.brand] ? (
        <p className="mt-4 max-w-content text-[15px] leading-relaxed text-text">{FORMAT_FIT[detail.brand]}</p>
      ) : null}

      {/* 3. 목적별 추천 좌석 구역 */}
      <section aria-label="목적별 좌석 구역" className="mt-6">
        <h2 className="text-lg font-bold text-text">목적별 좌석 구역</h2>
        <p className="mt-1 text-sm text-text-sub">
          하나의 “명당”이 아니라 목적별 구역으로만 안내해요. 잔여 좌석은 반영되지 않아요.
        </p>
        {detail.seatZones.length === 0 ? (
          <p className="mt-2 text-sm text-text-sub">아직 이 관의 좌석 구역 제보가 없어요.</p>
        ) : (
          <div className="mt-3">
            <SeatMap zones={detail.seatZones} />
          </div>
        )}
        <p className="mt-2.5">
          <Link
            href={`/cinemas/${detail.id}/report`}
            className="inline-flex items-center gap-1 text-sm font-medium text-text hover:underline decoration-border-strong underline-offset-2"
          >
            <IconEdit className="h-3.5 w-3.5" /> 좌석 구역 정보가 다르다면 제보해 주세요
          </Link>
        </p>
      </section>

      {/* 4~5. 예정 회차 + 예매/선택 CTA */}
      <section aria-label="예정 회차" className="mt-6">
        <h2 className="text-lg font-bold text-text">예정 회차</h2>
        {detail.upcomingShowtimes.length === 0 ? (
          <p className="mt-2 text-sm text-text-sub">등록된 예정 회차가 없어요.</p>
        ) : (
          <>
            {detail.upcomingShowtimes.some((s) => s.isSynthetic) ? (
              <div className="mt-2 max-w-content">
                <Notice>
                  “≈” 표시가 있는 회차는 <strong className="font-semibold">검증용 합성 데이터</strong>
                  예요. 실제 예매가 불가능해요.
                </Notice>
              </div>
            ) : null}
            <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-border p-0 text-sm">
              {detail.upcomingShowtimes.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3.5">
                  <span className="w-[76px] shrink-0 text-[15px] font-semibold tabular-nums text-text">
                    {dtFmt.format(new Date(s.startsAt))}
                  </span>
                  <span aria-hidden className="hidden h-4 w-px shrink-0 bg-border-strong sm:block" />
                  <Link
                    href={`/recommend/${s.movieId}`}
                    className="min-w-0 flex-1 truncate font-medium text-text hover:underline decoration-border-strong underline-offset-2"
                  >
                    {s.movieTitle}
                  </Link>
                  <FormatTag format={s.format} />
                  <ShowtimeStatusBadge kind={s.isSynthetic ? 'synthetic' : 'verified'} variant="compact" />
                  <span className="font-medium tabular-nums text-text-sub">{s.priceAdult.toLocaleString('ko-KR')}원</span>
                  {s.bookingUrl && !s.isSynthetic ? (
                    <a
                      className="inline-flex min-h-9 items-center font-semibold text-text hover:underline decoration-border-strong underline-offset-2"
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

      {/* 6. 상영관 사양(R15 §7) — 접이식이 아니라 실제 정보 카드로 채운다: 스크린·영사·
          사운드·좌석·데이터 상태. 값이 없는 항목은 "실측 정보 없음"으로 정직하게. */}
      <section aria-label="상영관 사양" className="mt-8 border-t border-border pt-6">
        <h2 className="m-0 text-lg font-bold text-text">상영관 사양</h2>

        {current ? (
          <div className="mt-3 max-w-3xl rounded-card-lg bg-surface-raised p-4 sm:p-5">
            {/* R17: 한 줄 나열 대신 2열 정의 그리드 — 데스크톱에서 표처럼 스캔된다. */}
            <div className="grid gap-x-10 gap-y-1.5 sm:grid-cols-2">
              <SpecRow label="좌석 수" value={detail.seatCount ? `${detail.seatCount}석` : null} />
              <SpecRow
                label="영사기"
                value={[
                  LIGHT_LABELS[current.projector?.lightSource ?? ''] ?? current.projector?.lightSource,
                  current.projector?.resolution?.toUpperCase(),
                  current.projector?.dual ? '듀얼' : null,
                  // 내부 코드값(gt_dual_laser 등)을 표시용 라벨로 — 원본 키는 관리자 화면에서만.
                  current.projector?.imaxGrade ? humanizeObservationValue(current.projector.imaxGrade) : null,
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
              <SpecRow
                label="사운드"
                value={current.sound?.format ? humanizeObservationValue(current.sound.format) : null}
              />
              <SpecRow
                label="표시 가능한 최대 확장비"
                value={current.supportedAr ? `${current.supportedAr}:1` : '확인 안 됨'}
              />
              <SpecRow label="마스킹" value={MASKING_LABELS[current.masking ?? 'unknown']} />
            </div>
            {current.renewalEvent ? (
              <p className="mb-0 mt-2.5 flex items-start gap-1.5 text-sm text-text-sub">
                <IconWrench className="mt-0.5 h-4 w-4 shrink-0" /> {current.renewalEvent}
              </p>
            ) : null}
            {current.notes ? (
              <p className="mb-0 mt-1 flex items-start gap-1.5 text-sm text-text-sub">
                <IconNote className="mt-0.5 h-4 w-4 shrink-0" /> {current.notes}
              </p>
            ) : null}
            <p className="mb-0 mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-sm text-text-sub">
              <span className="font-medium text-text-tertiary">데이터 상태</span>
              <TrustBadge status={current.infoStatus} observedAt={current.observedAt} />
              {current.sourceUrl ? (
                <a
                  className="text-text hover:underline decoration-border-strong underline-offset-2"
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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

        {history.length > 0 ? (
          <details className="mt-4 max-w-content border-t border-border pt-4">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-text">
              사양 변경 이력
            </summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-sm">
              {history.map((h, i) => (
                <li key={i} className="rounded-card bg-surface-strong px-4 py-3">
                  <span className="text-text-sub">
                    {h.validFrom} ~ {h.validTo ?? '현재'}
                  </span>
                  {h.renewalEvent ? <span className="ml-2 text-text">{h.renewalEvent}</span> : null}
                  <TrustBadge status={h.infoStatus} observedAt={h.observedAt} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {/* 7. 출처·근거 기록 — 내부 필드 키·코드값을 사용자 언어로 변환해 노출(R15 §7). */}
      {detail.observations.length > 0 ? (
        <section aria-label="근거 기록" className="mt-6">
          <h2 className="text-lg font-bold text-text">근거 기록</h2>
          <p className="mt-1 text-sm text-text-sub">이 관의 사양 판단에 쓰인 관측 기록이에요.</p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-sm">
            {detail.observations.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-text-sub">{humanizeObservationField(o.field)}</span>
                <span className="font-medium text-text">{humanizeObservationValue(o.value)}</span>
                <TrustBadge status={o.infoStatus} observedAt={o.observedAt} />
                <span className="text-text-sub">{o.sourceName ?? '출처 없음'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6">
        <Link className="text-text hover:underline decoration-border-strong underline-offset-2" href="/sources">
          정보 출처·신뢰도 기준 →
        </Link>
      </p>
      </div>
    </main>
  );
}

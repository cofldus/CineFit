'use client';

import { useState } from 'react';
import { REPORT_TYPES, REPORT_TYPE_LABELS } from '../src/lib/reportValidation';
import { IconChevronRight } from './Icon';
import { StepSection } from './StepSection';

const inputCls =
  'min-h-12 w-full rounded-card-lg border border-border bg-bg px-3.5 text-base text-text outline-none transition-shadow focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-primary-soft';
const selectCls = `${inputCls} appearance-none pr-10`;
const labelCls = 'block text-sm font-semibold text-text';

function SelectChevron() {
  return (
    <IconChevronRight aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-text-tertiary" />
  );
}

const PURPOSES = [
  ['immersive', '몰입'],
  ['overview', '전체 시야'],
  ['subtitle', '자막'],
  ['sound', '사운드'],
  ['neck_easy', '목 편함'],
  ['low_motion', '모션 약함'],
  ['exit_easy', '출입 편함'],
  ['wheelchair', '접근성'],
] as const;

const SPEC_KINDS = [
  ['projector', '영사기'],
  ['screen', '스크린'],
  ['sound', '음향'],
  ['supported_ar', '표시 가능한 화면비'],
  ['masking', '마스킹'],
  ['other', '기타 사양'],
] as const;

type Phase =
  | { kind: 'editing' }
  | { kind: 'submitting' }
  | { kind: 'done'; id: number; duplicateSuspect: boolean }
  | { kind: 'error'; messages: string[] };

export function ReportForm({
  auditoriumId,
  showtimes,
}: {
  auditoriumId: number;
  showtimes: { id: number; label: string }[];
}) {
  const [reportType, setReportType] = useState<string>('seat_zone');
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });

  const isSeatZone = reportType === 'seat_zone';
  const isSpecLike = ['auditorium_spec', 'renovation', 'accessibility', 'operational_status'].includes(reportType);
  const isShowtimeLike = ['showtime', 'booking_link'].includes(reportType);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase({ kind: 'submitting' });
    const fd = new FormData(e.currentTarget);
    const text = (name: string) => String(fd.get(name) ?? '').trim();

    let targetType: 'auditorium' | 'showtime' = 'auditorium';
    let targetId = auditoriumId;
    const claimedValue: Record<string, unknown> = {};

    if (isSeatZone) {
      claimedValue.purposes = PURPOSES.map(([v]) => v).filter((v) => fd.get(`purpose_${v}`) === 'on');
      claimedValue.rowRange = text('rowRange');
      claimedValue.differsFromCurrent = text('differsFromCurrent');
    } else if (isSpecLike) {
      claimedValue.specKind = text('specKind');
      claimedValue.currentValue = text('currentValue');
      claimedValue.claimedValue = text('claimedValue');
      claimedValue.isRenovation = reportType === 'renovation';
    } else if (isShowtimeLike) {
      const st = Number(text('showtimeId'));
      if (st) {
        targetType = 'showtime';
        targetId = st;
      }
      claimedValue.correctValue = text('correctValue');
      claimedValue.officialBookingUrl = text('officialBookingUrl');
      claimedValue.checkedAt = text('checkedAt');
    } else {
      claimedValue.detail = text('detail');
    }

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reportType,
        targetType,
        targetId,
        summary: text('summary'),
        claimedValue,
        evidenceUrl: text('evidenceUrl'),
        observedAt: text('observedAt'),
        contactEmail: text('contactEmail'),
        website: text('website'), // honeypot
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: number;
      duplicateSuspect?: boolean;
      error?: string;
      details?: string[];
    };
    if (res.ok && body.id) {
      setPhase({ kind: 'done', id: body.id, duplicateSuspect: Boolean(body.duplicateSuspect) });
    } else {
      setPhase({ kind: 'error', messages: body.details ?? [body.error ?? '제출에 실패했어요. 잠시 후 다시 시도해 주세요.'] });
    }
  }

  if (phase.kind === 'done') {
    return (
      <div className="rounded-card-lg border border-trust-high/40 bg-trust-high/10 p-5" role="status">
        <h2 className="m-0 text-lg font-bold text-text">
          제보가 접수됐어요 (접수번호 #<span data-testid="report-id">{phase.id}</span>)
        </h2>
        {phase.duplicateSuspect ? (
          <p className="mt-2 text-sm text-text-sub">
            비슷한 제보가 이미 접수되어 있어요. 함께 검토되며, 서로 다른 제보가 일치하면 신뢰도가
            높아져요.
          </p>
        ) : null}
        <p className="mt-2 text-sm text-text-sub">
          관리자가 근거를 검토한 뒤에만 서비스 정보에 반영돼요. 진행 상태는{' '}
          <code className="rounded bg-bg px-1">/api/reports/{phase.id}/status</code> 에서 확인할 수
          있어요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-label="정보 수정 제보" className="flex flex-col">
      <StepSection step={1} title="무엇이 잘못됐나요?" first>
        <label className="block">
          <span className={labelCls}>제보 유형</span>
          <div className="relative mt-1.5">
            <select
              className={selectCls}
              name="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
      </StepSection>

      <StepSection step={2} title="올바른 정보는 무엇인가요?">
        {isSeatZone ? (
          <>
            <div>
              <span className={labelCls}>어떤 목적의 좌석인가요? (복수 선택)</span>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {PURPOSES.map(([v, label]) => (
                  <label key={v} className="flex min-h-11 items-center gap-2 text-[15px] text-text">
                    <input className="h-5 w-5 accent-primary" type="checkbox" name={`purpose_${v}`} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className={labelCls}>열 또는 좌석 구역</span>
              <input className={`${inputCls} mt-1.5`} type="text" name="rowRange" placeholder="예: J~L열 중앙" required />
            </label>
            <label className="block">
              <span className={labelCls}>현재 표시된 정보와 다른 점 (선택)</span>
              <input className={`${inputCls} mt-1.5`} type="text" name="differsFromCurrent" />
            </label>
          </>
        ) : null}

        {isSpecLike ? (
          <>
            <label className="block">
              <span className={labelCls}>사양 종류</span>
              <div className="relative mt-1.5">
                <select className={selectCls} name="specKind" defaultValue="projector">
                  {SPEC_KINDS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </label>
            <label className="block">
              <span className={labelCls}>기존에 표시된 값 (선택)</span>
              <input className={`${inputCls} mt-1.5`} type="text" name="currentValue" />
            </label>
            <label className="block">
              <span className={labelCls}>제보하려는 값</span>
              <input className={`${inputCls} mt-1.5`} type="text" name="claimedValue" required />
            </label>
          </>
        ) : null}

        {isShowtimeLike ? (
          <>
            <label className="block">
              <span className={labelCls}>해당 회차 (선택)</span>
              <div className="relative mt-1.5">
                <select className={selectCls} name="showtimeId" defaultValue="">
                  <option value="">이 상영관 전체</option>
                  {showtimes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </label>
            <label className="block">
              <span className={labelCls}>올바르다고 생각하는 내용</span>
              <input className={`${inputCls} mt-1.5`} type="text" name="correctValue" required />
            </label>
            <label className="block">
              <span className={labelCls}>공식 예매 URL (선택)</span>
              <input className={`${inputCls} mt-1.5`} type="url" name="officialBookingUrl" placeholder="https://..." />
            </label>
            <label className="block">
              <span className={labelCls}>확인한 시각 (선택)</span>
              <input className={`${inputCls} mt-1.5`} type="datetime-local" name="checkedAt" />
            </label>
          </>
        ) : null}

        {!isSeatZone && !isSpecLike && !isShowtimeLike ? (
          <label className="block">
            <span className={labelCls}>내용</span>
            <input className={`${inputCls} mt-1.5`} type="text" name="detail" required />
          </label>
        ) : null}
      </StepSection>

      <StepSection step={3} title="언제, 어떤 근거로 확인하셨나요?">
        <label className="block">
          <span className={labelCls}>근거 설명</span>
          <textarea
            className={`${inputCls} mt-1.5 min-h-24 py-2`}
            name="summary"
            maxLength={500}
            required
            placeholder="어떻게 확인하셨나요? (개인정보는 적지 마세요)"
          />
        </label>
        <label className="block">
          <span className={labelCls}>실제 관람·확인일 (선택)</span>
          <input className={`${inputCls} mt-1.5`} type="date" name="observedAt" />
        </label>
        <label className="block">
          <span className={labelCls}>증빙 URL (선택 — 공식 출처가 있으면 꼭 첨부해 주세요)</span>
          <input className={`${inputCls} mt-1.5`} type="url" name="evidenceUrl" placeholder="https://..." />
        </label>
        <label className="block">
          <span className={labelCls}>연락 이메일 (선택 — 공개되지 않아요)</span>
          <input className={`${inputCls} mt-1.5`} type="email" name="contactEmail" />
          <span className="mt-1 block text-xs text-text-sub">
            나중에 이 이메일을 지우고 싶다면{' '}
            <a href="/privacy" className="font-semibold text-text hover:underline decoration-border-strong underline-offset-2">
              여기서 요청
            </a>
            할 수 있어요.
          </span>
        </label>
        {/* honeypot — 사람에게는 보이지 않는 필드 */}
        <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
          <label>
            웹사이트 <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </StepSection>

      {phase.kind === 'error' ? (
        <div role="alert" className="mt-6 rounded-card border border-trust-low/40 bg-trust-low/10 px-4 py-3 text-sm text-text">
          {phase.messages.map((m) => (
            <p key={m} className="m-0">
              · {m}
            </p>
          ))}
        </div>
      ) : null}

      <button
        type="submit"
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
        disabled={phase.kind === 'submitting'}
      >
        {phase.kind === 'submitting' ? '제출 중…' : '제보 제출'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {phase.kind === 'submitting' ? '제보를 제출하고 있습니다. 잠시만 기다려 주세요.' : ''}
      </span>
    </form>
  );
}

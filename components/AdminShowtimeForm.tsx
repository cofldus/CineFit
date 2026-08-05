'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

// R18 배치 등록: "19:00, 22:10"처럼 콤마로 여러 시작 시각을 받는다(수동 운영 고속화).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseStartTimes(raw: string): { times: string[]; invalid: string[] } {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { times: parts.filter((p) => TIME_RE.test(p)), invalid: parts.filter((p) => !TIME_RE.test(p)) };
}

export interface AdminFormOption {
  id: number;
  label: string;
}

export interface AdminFormInitial {
  movieId?: number;
  auditoriumId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  format?: string;
  is3d?: boolean;
  language?: string;
  price?: number;
  bookingUrl?: string;
  infoStatus?: string;
  isSynthetic?: boolean;
  status?: string;
  adminNote?: string;
  mismatchNote?: string;
  sourceUrl?: string;
  expiresAt?: string;
}

const FORMATS = [
  ['imax', 'IMAX'],
  ['dolby_cinema', '돌비시네마'],
  ['4dx', '4DX'],
  ['mx4d', 'MX4D'],
  ['screenx', 'SCREENX'],
  ['superplex', '수퍼플렉스(대형 일반)'],
  ['standard', '일반(2D 디지털)'],
] as const;

export function AdminShowtimeForm({
  movies,
  auditoriums,
  initial = {},
  showtimeId,
  duplicateOf,
}: {
  movies: AdminFormOption[];
  auditoriums: AdminFormOption[];
  initial?: AdminFormInitial;
  showtimeId?: number; // 있으면 수정(PATCH), 없으면 생성(POST)
  duplicateOf?: number;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [needsMismatchNote, setNeedsMismatchNote] = useState(false);
  const [busy, setBusy] = useState(false);
  // R18: 생성 모드는 등록 후 목록으로 튕기지 않고 이 화면에 남는다(같은 관·영화·날짜로
  // 연속 등록). 방금 몇 건이 등록됐는지만 배너로 알려주고 시작 시각 입력만 비운다.
  const [savedCount, setSavedCount] = useState(0);
  const startTimeRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    setWarnings([]);
    setSavedCount(0);
    const fd = new FormData(e.currentTarget);
    const base = {
      movieId: fd.get('movieId'),
      auditoriumId: fd.get('auditoriumId'),
      date: fd.get('date'),
      endTime: fd.get('endTime') || undefined,
      crossesMidnight: fd.get('crossesMidnight') === 'on',
      format: fd.get('format'),
      is3d: fd.get('is3d') === 'on',
      language: fd.get('language'),
      price: fd.get('price'),
      bookingUrl: fd.get('bookingUrl'),
      sourceUrl: fd.get('sourceUrl') || undefined,
      expiresAt: fd.get('expiresAt') || undefined,
      sourceNote: fd.get('sourceNote'),
      infoStatus: fd.get('infoStatus'),
      isSynthetic: fd.get('isSynthetic') === 'on',
      status: fd.get('status'),
      adminNote: fd.get('adminNote') || undefined,
      mismatchNote: fd.get('mismatchNote') || undefined,
      ...(duplicateOf ? { duplicateOf } : {}),
    };

    async function submitOne(startTime: string) {
      const res = await fetch(showtimeId ? `/api/admin/showtimes/${showtimeId}` : '/api/admin/showtimes', {
        method: showtimeId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...base, startTime }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string[];
        warnings?: string[];
        needsMismatchNote?: boolean;
      };
      return { ok: res.ok, body };
    }

    // 수정 모드는 단일 시각만 허용 — 기존 동작 유지(저장 후 목록 이동).
    if (showtimeId) {
      const { ok, body } = await submitOne(String(fd.get('startTime')));
      if (ok) {
        router.push('/admin/showtimes');
        router.refresh();
        return;
      }
      setErrors(body.details ?? [body.error ?? '저장에 실패했습니다.']);
      setNeedsMismatchNote(Boolean(body.needsMismatchNote));
      setBusy(false);
      return;
    }

    const { times, invalid } = parseStartTimes(String(fd.get('startTime') ?? ''));
    if (invalid.length > 0 || times.length === 0) {
      setErrors([`시작 시각 형식을 확인해 주세요 (HH:MM, 콤마로 여러 개): ${invalid.join(', ') || '입력 없음'}`]);
      setBusy(false);
      return;
    }
    // 여러 시각을 등록할 때 종료 시각·심야 플래그는 시각마다 다를 수 있어 안전하게 무시하고
    // 러닝타임 기반 추정에 맡긴다(단일 시각이면 입력값 그대로).
    if (times.length > 1) {
      base.endTime = undefined;
      base.crossesMidnight = false;
    }

    const failed: string[] = [];
    const collectedWarnings: string[] = [];
    let saved = 0;
    for (const t of times) {
      const { ok, body } = await submitOne(t);
      if (ok) {
        saved += 1;
        if (body.warnings?.length) collectedWarnings.push(...body.warnings.map((w) => `${t} — ${w}`));
      } else {
        failed.push(`${t} — ${(body.details ?? [body.error ?? '저장 실패']).join(', ')}`);
        setNeedsMismatchNote((prev) => prev || Boolean(body.needsMismatchNote));
      }
    }

    setSavedCount(saved);
    setWarnings(collectedWarnings);
    setErrors(failed);
    if (saved > 0 && startTimeRef.current) startTimeRef.current.value = '';
    router.refresh();
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} aria-label="회차 입력">
      <label className="field">
        <span>영화</span>
        <select name="movieId" defaultValue={initial.movieId ?? ''} required>
          <option value="" disabled>
            선택하세요
          </option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>극장·상영관</span>
        <select name="auditoriumId" defaultValue={initial.auditoriumId ?? ''} required>
          <option value="" disabled>
            선택하세요
          </option>
          {auditoriums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>상영 날짜</span>
          <input type="date" name="date" defaultValue={initial.date} required />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>{showtimeId ? '시작 시각' : '시작 시각 (콤마로 여러 개)'}</span>
          <input
            ref={startTimeRef}
            type="text"
            inputMode="numeric"
            name="startTime"
            defaultValue={initial.startTime}
            placeholder="19:00 또는 10:30, 14:00, 19:00"
            aria-label="시작 시각"
            required
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>종료 시각 (비우면 러닝타임+20분)</span>
          <input type="time" name="endTime" defaultValue={initial.endTime} />
        </label>
      </div>
      <label className="checkline">
        <input type="checkbox" name="crossesMidnight" /> 심야 회차 (종료가 다음 날)
      </label>

      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>상영 포맷</span>
          <select name="format" defaultValue={initial.format ?? 'standard'}>
            {FORMATS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>언어</span>
          <select name="language" defaultValue={initial.language ?? 'sub'}>
            <option value="sub">자막</option>
            <option value="dub">더빙</option>
            <option value="none">해당 없음</option>
          </select>
        </label>
      </div>
      <label className="checkline">
        <input type="checkbox" name="is3d" defaultChecked={initial.is3d} /> 3D 상영
      </label>

      <label className="field">
        <span>성인 1인 가격 (원)</span>
        <input type="number" name="price" min={0} step={500} defaultValue={initial.price ?? 15000} required />
      </label>

      <label className="field">
        <span>공식 예매 URL</span>
        <input
          type="url"
          name="bookingUrl"
          placeholder="https://..."
          defaultValue={initial.bookingUrl}
          required
        />
      </label>

      <label className="field">
        <span>확인한 공식 페이지 URL (실제 회차 필수 — 극장사 공식 도메인만)</span>
        <input type="url" name="sourceUrl" placeholder="https://..." defaultValue={initial.sourceUrl} />
      </label>

      <label className="field">
        <span>정보 출처 (어디서 확인했나)</span>
        <input type="text" name="sourceNote" placeholder="예: CGV 공식 예매 페이지에서 직접 확인" required />
      </label>

      <label className="field">
        <span>만료 시각 (선택 — 비우면 상영 시작 기준 자동 만료)</span>
        <input type="datetime-local" name="expiresAt" defaultValue={initial.expiresAt} />
      </label>

      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>데이터 상태</span>
          <select name="infoStatus" defaultValue={initial.infoStatus ?? 'official'}>
            <option value="official">공식 확인</option>
            <option value="multi_source">복수 출처</option>
            <option value="user_report">사용자 제보</option>
            <option value="single_unverified">단일 출처 미확인</option>
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>운영 상태</span>
          <select name="status" defaultValue={initial.status ?? 'active'}>
            <option value="active">활성</option>
            <option value="disabled">비활성</option>
          </select>
        </label>
      </div>

      <label className="checkline">
        <input type="checkbox" name="isSynthetic" defaultChecked={initial.isSynthetic} /> 검증용 합성
        데이터 (실제 회차 아님)
      </label>

      <label className="field">
        <span>관리자 메모 (선택)</span>
        <input type="text" name="adminNote" defaultValue={initial.adminNote} />
      </label>

      {needsMismatchNote || initial.mismatchNote ? (
        <label className="field">
          <span>포맷 불일치 근거 (배급 버전에 없는 포맷을 등록하는 이유·출처)</span>
          <input type="text" name="mismatchNote" defaultValue={initial.mismatchNote} />
        </label>
      ) : (
        <input type="hidden" name="mismatchNote" value={initial.mismatchNote ?? ''} />
      )}

      {savedCount > 0 ? (
        <div role="status" className="notice" style={{ borderLeftColor: 'var(--trust-high)' }}>
          <p style={{ margin: '2px 0' }}>
            ✓ 회차 {savedCount}건 등록 완료 — 같은 조건으로 계속 등록하거나{' '}
            <Link href="/admin/showtimes" style={{ textDecoration: 'underline' }}>
              회차 목록 보기
            </Link>
          </p>
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div role="alert" className="notice" style={{ borderColor: 'var(--trust-low)' }}>
          {errors.map((e) => (
            <p key={e} style={{ margin: '2px 0' }}>
              · {e}
            </p>
          ))}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div role="status" className="notice">
          {warnings.map((w) => (
            <p key={w} style={{ margin: '2px 0' }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? '저장 중…' : showtimeId ? '수정 저장' : '회차 등록'}
      </button>
    </form>
  );
}

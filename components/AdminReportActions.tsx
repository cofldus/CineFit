'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  SEAT_ZONE_PURPOSES,
  SEAT_ZONE_PURPOSE_LABELS,
} from '../src/lib/adminReportValidation';

interface ZoneOption {
  id: number;
  purposes: string[];
  rowRange: string | null;
  colRange: string | null;
  confidence: number;
}

interface Props {
  reportId: number;
  status: string;
  reportType: string;
  targetType: string;
  /** 대상 상영관의 활성 존 — supersedes 선택지 (좌석 구역 제보에만 전달) */
  activeZones?: ZoneOption[];
}

export function AdminReportActions({ reportId, status, reportType, targetType, activeZones = [] }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [field, setField] = useState('');
  const [obsConfidence, setObsConfidence] = useState('0.55');

  const [purposes, setPurposes] = useState<string[]>([]);
  const [rowRange, setRowRange] = useState('');
  const [colRange, setColRange] = useState('');
  const [rationale, setRationale] = useState('');
  const [zoneConfidence, setZoneConfidence] = useState('0.55');
  const [supersedes, setSupersedes] = useState('');

  const terminal = status === 'promoted' || status === 'rejected' || status === 'duplicate';
  const canPromoteZone = reportType === 'seat_zone' && targetType === 'auditorium';

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
      setError(data.details?.join(' / ') ?? data.error ?? '처리에 실패했습니다.');
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  if (terminal) {
    return <p className="sub">종결된 제보입니다 — 상태 변경·승격이 불가합니다.</p>;
  }

  return (
    <div className="card" aria-label="제보 검토 액션">
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}

      <h3>검토 상태 변경</h3>
      <label className="field">
        <span>메모 (반려·중복 시 사유로 기록)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="예: 증빙 불충분" />
      </label>
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={() => send({ action: 'under_review', note: note || undefined })}>
          검토 시작
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => send({ action: 'needs_more_information', note: note || undefined })}
        >
          추가 정보 필요
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => send({ action: 'rejected', note: note || undefined })}>
          반려
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => send({ action: 'duplicate', note: note || undefined })}>
          중복 처리
        </button>
      </div>

      <h3>관찰 기록으로 승인</h3>
      <p className="sub">
        추천 데이터에 직접 반영되지 않고 관찰 기록(observations)에만 남습니다. 신뢰도는 정책 상한
        (단일 0.55 / 증빙 0.65 / 복수 일치 0.75)으로 자동 제한됩니다.
      </p>
      <div className="row">
        <label className="field" style={{ flex: 2, minWidth: 160 }}>
          <span>field (예: screen.aspect)</span>
          <input value={field} onChange={(e) => setField(e.target.value)} maxLength={60} placeholder="seat_zone" />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 100 }}>
          <span>신뢰도</span>
          <input
            type="number"
            step="0.05"
            min="0.05"
            max="1"
            value={obsConfidence}
            onChange={(e) => setObsConfidence(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || status === 'approved_as_observation'}
        onClick={() => send({ action: 'approve_observation', field, confidence: Number(obsConfidence) })}
      >
        {status === 'approved_as_observation' ? '이미 승인됨' : '관찰 기록 승인'}
      </button>

      {canPromoteZone ? (
        <>
          <h3>좌석 존으로 승격</h3>
          <p className="sub">
            기존 존을 덮어쓰지 않습니다 — 대체 대상을 지정하면 그 존은 비활성 처리되고 계보로 남습니다.
          </p>
          <div className="row" role="group" aria-label="목적 선택">
            {SEAT_ZONE_PURPOSES.map((p) => (
              <label key={p} className="field" style={{ flexDirection: 'row', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={purposes.includes(p)}
                  onChange={(e) =>
                    setPurposes((prev) => (e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)))
                  }
                />
                <span>{SEAT_ZONE_PURPOSE_LABELS[p]}</span>
              </label>
            ))}
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1, minWidth: 120 }}>
              <span>행 범위</span>
              <input value={rowRange} onChange={(e) => setRowRange(e.target.value)} maxLength={40} placeholder="J~K열" />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 120 }}>
              <span>열 범위</span>
              <input value={colRange} onChange={(e) => setColRange(e.target.value)} maxLength={40} placeholder="중앙 블록" />
            </label>
            <label className="field" style={{ flex: 1, minWidth: 100 }}>
              <span>신뢰도</span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1"
                value={zoneConfidence}
                onChange={(e) => setZoneConfidence(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>근거 (승격 사유 — 필수)</span>
            <input
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={500}
              placeholder="예: 서로 다른 세션 복수 제보 일치"
            />
          </label>
          <label className="field">
            <span>대체할 기존 존 (선택)</span>
            <select value={supersedes} onChange={(e) => setSupersedes(e.target.value)}>
              <option value="">대체 없음 — 새 존 추가</option>
              {activeZones.map((z) => (
                <option key={z.id} value={z.id}>
                  #{z.id} {z.rowRange ?? ''} {z.colRange ?? ''} ({z.purposes.join(', ')}, 신뢰도 {z.confidence})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              send({
                action: 'promote_seat_zone',
                purposes,
                rowRange: rowRange || undefined,
                colRange: colRange || undefined,
                rationale,
                confidence: Number(zoneConfidence),
                supersedesSeatZoneId: supersedes ? Number(supersedes) : undefined,
              })
            }
          >
            좌석 존 승격
          </button>
        </>
      ) : null}
    </div>
  );
}

'use client';

// R21 — 관리자 회차 CSV import UI. 파일 선택 또는 붙여넣기 → 미리보기(검증만) →
// 등록. 오류 행은 CSV로 다시 내려받아 고친 뒤 재업로드할 수 있다.
import { useRef, useState } from 'react';
import type { ImportResult, ImportRowResult } from '../src/data/showtimeImportService';
import { toCsv } from '../src/lib/csv';

const TEMPLATE_HEADER =
  'provider,theater,auditorium,movie,showDate,startsAt,format,price,sourceUrl,checkedAt,expiresAt,verificationStatus';
const TEMPLATE_ROW =
  'cgv_official,CGV 용산아이파크몰,IMAX관,듄: 파트 2,2026-08-09,19:30,imax,28000,https://ticket.cgv.co.kr/example,2026-08-05T10:00:00+09:00,,verified';

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function errorRowsCsv(rows: ImportRowResult[]): string {
  const header = [...TEMPLATE_HEADER.split(','), 'errors'];
  const body = rows
    .filter((r) => r.status === 'error')
    .map((r) => [
      r.raw.provider,
      r.raw.theater,
      r.raw.auditorium,
      r.raw.movie,
      r.raw.showdate,
      r.raw.startsat,
      r.raw.format,
      r.raw.price,
      r.raw.sourceurl,
      r.raw.checkedat,
      r.raw.expiresat,
      r.raw.verificationstatus,
      r.errors.join(' / '),
    ]);
  return toCsv([header, ...body]);
}

export function AdminShowtimeImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  async function readFile(file: File) {
    setCsvText(await file.text());
    setResult(null);
  }

  async function run(commit: boolean) {
    setBusy(true);
    setFatal(null);
    try {
      const r = await fetch('/api/admin/showtimes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, commit }),
      });
      const j = (await r.json()) as ImportResult & { error?: string };
      if (!r.ok && j.error) {
        setFatal(j.error);
        setResult(null);
      } else {
        setResult(j);
        if (j.headerErrors?.length) setFatal(j.headerErrors.join(' / '));
      }
    } catch {
      setFatal('요청에 실패했습니다 — 네트워크 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const errorCount = result?.summary.errors ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <h2 className="m-0 text-base font-bold">1. CSV 입력</h2>
        <p className="m-0 mt-1 text-sm opacity-80">
          헤더: <code className="text-[12px]">{TEMPLATE_HEADER}</code>
        </p>
        <p className="m-0 mt-1 text-sm opacity-80">
          sourceUrl(확인한 공식 페이지)·checkedAt(확인 시각)은 필수예요. import되는 회차는 항상
          실제 데이터로 저장돼요(합성 아님).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV 파일 선택"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
            }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => downloadCsv('showtime-import-template.csv', `${TEMPLATE_HEADER}\r\n${TEMPLATE_ROW}`)}
          >
            템플릿 CSV 내려받기
          </button>
        </div>
        <textarea
          aria-label="CSV 내용"
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setResult(null);
          }}
          rows={8}
          placeholder={`${TEMPLATE_HEADER}\n${TEMPLATE_ROW}`}
          className="mt-3 w-full rounded-[8px] border border-border bg-bg p-2 font-mono text-[12.5px]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={busy || !csvText.trim()} onClick={() => run(false)}>
            {busy ? '처리 중…' : '미리보기 (검증만)'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !result || result.committed || result.summary.ready === 0}
            onClick={() => run(true)}
            title={!result ? '먼저 미리보기로 검증하세요' : undefined}
          >
            유효 행 {result?.summary.ready ?? 0}건 등록
          </button>
        </div>
        {fatal ? (
          <p className="m-0 mt-2 text-sm text-trust-low" role="alert">
            {fatal}
          </p>
        ) : null}
      </div>

      {result && !result.headerErrors.length ? (
        <div className="card" data-testid="import-preview">
          <h2 className="m-0 text-base font-bold">
            2. {result.committed ? '등록 결과' : '미리보기'} — 전체 {result.summary.total}건 · 유효{' '}
            {result.summary.ready}건 · 오류 {result.summary.errors}건
            {result.committed ? ` · 등록됨 ${result.summary.created}건` : ''}
          </h2>
          {errorCount > 0 ? (
            <p className="m-0 mt-2">
              <button
                type="button"
                className="btn"
                onClick={() => downloadCsv('showtime-import-errors.csv', errorRowsCsv(result.rows))}
              >
                오류 행 {errorCount}건 CSV 내려받기
              </button>
            </p>
          ) : null}
          <div className="table-scroll mt-3" tabIndex={0} role="region" aria-label="import 미리보기 (가로 스크롤)">
            <table className="compare">
              <thead>
                <tr>
                  <th>행</th>
                  <th>상태</th>
                  <th>영화</th>
                  <th>상영관</th>
                  <th>시작</th>
                  <th>포맷</th>
                  <th>가격</th>
                  <th>메시지</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.status === 'created' ? `등록됨 #${r.createdId}` : r.status === 'ready' ? '유효' : '오류'}</td>
                    <td>{r.resolved?.movieTitle ?? r.raw.movie}</td>
                    <td>{r.resolved?.auditoriumLabel ?? `${r.raw.theater} ${r.raw.auditorium}`}</td>
                    <td>
                      {r.raw.showdate} {r.raw.startsat}
                    </td>
                    <td>{r.raw.format}</td>
                    <td>{r.raw.price}</td>
                    <td className="max-w-[360px] whitespace-normal text-[12.5px]">
                      {[...r.errors, ...r.warnings].join(' / ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// 개인정보 삭제 요청 서비스 회귀 테스트 — 임시 DB 직접 시드
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-privacy-')), 'privacy-test.db');

import { getAppDbClient } from '../../src/data/client/index';
import { privacyRequestService } from '../../src/data/privacyRequestService';

let auditoriumId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });

  const db = getAppDbClient();
  const [auditorium] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);
  auditoriumId = auditorium.id;
});

const NOW = new Date('2026-07-28T00:00:00+09:00');
const iso = (s: string) => new Date(s).toISOString();

async function seedSession(sessionId: string) {
  const db = getAppDbClient();
  await db.run(`INSERT INTO analytics_sessions (id, first_seen_at, last_seen_at) VALUES (?,?,?)`, [
    sessionId,
    iso('2026-07-01T00:00:00+09:00'),
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  await db.run(`INSERT INTO analytics_events (session_id, event_name, created_at) VALUES (?,?,?)`, [
    sessionId,
    'app_opened',
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  const runRows = await db.query<{ id: number }>(
    `INSERT INTO recommendation_runs (request, weights, results, session_id, created_at) VALUES ('{}','{}','[]',?,?) RETURNING id`,
    [sessionId, iso('2026-07-01T00:00:00+09:00')],
  );
  await db.run(
    `INSERT INTO recommendation_feedback (recommendation_run_id, helpfulness, session_id, created_at) VALUES (?,?,?,?)`,
    [runRows[0].id, 'very_helpful', sessionId, iso('2026-07-01T00:00:00+09:00')],
  );
  await db.run(`INSERT INTO alpha_consents (session_id, consented_at) VALUES (?,?)`, [sessionId, iso('2026-07-01T00:00:00+09:00')]);
}

async function seedReport(contactEmail: string | null): Promise<number> {
  const db = getAppDbClient();
  const rows = await db.query<{ id: number }>(
    `INSERT INTO issue_reports
       (report_type, target_type, target_id, status, summary, claimed_value_json, submitted_at,
        anonymous_session_hash, contact_email, source_type, created_at, updated_at)
     VALUES ('other','auditorium',?,'submitted','테스트 제보','{}',?,?,?,'user_report',?,?) RETURNING id`,
    [auditoriumId, iso('2026-07-01T00:00:00+09:00'), 'hash-1', contactEmail, iso('2026-07-01T00:00:00+09:00'), iso('2026-07-01T00:00:00+09:00')],
  );
  return rows[0].id;
}

describe('세션 유형 삭제 요청', () => {
  it('제출 → 미리보기 → 처리하면 세션에 딸린 데이터가 전부 지워진다', async () => {
    await seedSession('sess-priv-1');

    const submitted = await privacyRequestService.submitSessionRequest({
      sessionId: 'sess-priv-1',
      message: '지워주세요',
      sessionHash: 'req-hash-1',
      now: NOW,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const preview = await privacyRequestService.previewImpact(submitted.id);
    expect(preview?.type).toBe('session');
    if (preview?.type === 'session') {
      expect(preview.analyticsEvents).toBe(1);
      expect(preview.recommendationFeedback).toBe(1);
      expect(preview.alphaConsents).toBe(1);
      expect(preview.analyticsSessionExists).toBe(true);
    }

    const result = await privacyRequestService.complete({ id: submitted.id, actor: 'admin', now: NOW });
    expect(result.ok).toBe(true);

    const db = getAppDbClient();
    const events = await db.query(`SELECT 1 FROM analytics_events WHERE session_id = ?`, ['sess-priv-1']);
    expect(events).toHaveLength(0);
    const sessions = await db.query(`SELECT 1 FROM analytics_sessions WHERE id = ?`, ['sess-priv-1']);
    expect(sessions).toHaveLength(0);

    const req = await privacyRequestService.get(submitted.id);
    expect(req?.status).toBe('completed');
    expect(req?.affectedSummary).toMatchObject({ analyticsEvents: 1, analyticsSessionsDeleted: 1 });
  });

  it('이미 처리된 요청은 다시 처리할 수 없다', async () => {
    await seedSession('sess-priv-2');
    const submitted = await privacyRequestService.submitSessionRequest({
      sessionId: 'sess-priv-2',
      message: '',
      sessionHash: 'req-hash-2',
      now: NOW,
    });
    if (!submitted.ok) throw new Error('setup failed');
    await privacyRequestService.complete({ id: submitted.id, actor: 'admin', now: NOW });

    const second = await privacyRequestService.complete({ id: submitted.id, actor: 'admin', now: NOW });
    expect(second).toEqual({ ok: false, error: 'already_reviewed' });
  });
});

describe('이메일 유형 삭제 요청', () => {
  it('처리하면 해당 이메일이 달린 제보의 contact_email만 지워지고 내용은 남는다', async () => {
    const reportId = await seedReport('user@example.com');

    const submitted = await privacyRequestService.submitEmailRequest({
      contactEmail: 'user@example.com',
      message: '',
      sessionHash: 'req-hash-3',
      now: NOW,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const preview = await privacyRequestService.previewImpact(submitted.id);
    expect(preview?.type).toBe('email');
    if (preview?.type === 'email') expect(preview.matchingReports.map((r) => r.id)).toContain(reportId);

    const result = await privacyRequestService.complete({ id: submitted.id, actor: 'admin', now: NOW });
    expect(result.ok).toBe(true);

    const db = getAppDbClient();
    const rows = await db.query<{ contact_email: string | null; summary: string }>(
      `SELECT contact_email, summary FROM issue_reports WHERE id = ?`,
      [reportId],
    );
    expect(rows[0].contact_email).toBeNull();
    expect(rows[0].summary).toBe('테스트 제보'); // 제보 내용 자체는 유지된다
  });
});

describe('반려', () => {
  it('반려하면 상태만 바뀌고 데이터는 지워지지 않는다', async () => {
    await seedSession('sess-priv-3');
    const submitted = await privacyRequestService.submitSessionRequest({
      sessionId: 'sess-priv-3',
      message: '',
      sessionHash: 'req-hash-4',
      now: NOW,
    });
    if (!submitted.ok) throw new Error('setup failed');

    const rejected = await privacyRequestService.reject({ id: submitted.id, actor: 'admin', now: NOW, note: '잘못된 세션 id' });
    expect(rejected.ok).toBe(true);

    const req = await privacyRequestService.get(submitted.id);
    expect(req?.status).toBe('rejected');
    expect(req?.resolutionNote).toBe('잘못된 세션 id');

    const db = getAppDbClient();
    const sessions = await db.query(`SELECT 1 FROM analytics_sessions WHERE id = ?`, ['sess-priv-3']);
    expect(sessions).toHaveLength(1); // 지워지지 않았다
  });
});

describe('남용 방지', () => {
  it('같은 요청자 해시로 1시간에 3건을 넘기면 거부된다', async () => {
    for (let i = 0; i < 3; i++) {
      await seedSession(`sess-rate-${i}`);
      const r = await privacyRequestService.submitSessionRequest({
        sessionId: `sess-rate-${i}`,
        message: '',
        sessionHash: 'rate-hash-1',
        now: NOW,
      });
      expect(r.ok).toBe(true);
    }
    const fourth = await privacyRequestService.submitSessionRequest({
      sessionId: 'sess-rate-3',
      message: '',
      sessionHash: 'rate-hash-1',
      now: NOW,
    });
    expect(fourth).toEqual({ ok: false, error: 'rate_limited' });
  });
});

// 관리자 제보 검토·승격 API 회귀 테스트 — 임시 DB에 직접 시드 (라이브 파일 복사 금지)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.ADMIN_PASSWORD = 'test-admin-pw';
process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-reports-')), 'reports-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { createAdminToken } from '../../src/lib/adminAuth';
import { getAppClock } from '../../src/lib/clock';
import { getAppDbClient } from '../../src/data/client/index';
import { reportService } from '../../src/data/reportService';
import { seatZoneRepository } from '../../src/data/seatZoneRepository';
import { GET as listGet } from '../../app/api/admin/reports/route';
import { GET as detailGet, PATCH as patchRoute } from '../../app/api/admin/reports/[id]/route';
import { REPORT_CONFIDENCE_CAPS } from '../../src/domain/trust/confidencePolicy';

const TOKEN = createAdminToken('test-admin-pw');
const auth = { 'x-admin-token': TOKEN, 'content-type': 'application/json' };
const url = 'http://localhost/api/admin/reports';

const patch = (id: number, body: unknown, headers: Record<string, string> = auth) =>
  patchRoute(new Request(`${url}/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: String(id) }),
  });

const now = () => getAppClock().now();

/** 테스트용 제보 생성 — 세션 해시를 바꿔 rate limit·독립 제보 수를 제어한다 */
async function seedReport(overrides: Record<string, unknown> = {}, sessionHash = 'session-a') {
  const result = await reportService.create(
    {
      reportType: 'seat_zone',
      targetType: 'auditorium',
      targetId: 1,
      summary: 'J~K열 중앙이 자막 읽기 편했습니다.',
      claimedValue: { rowRange: 'J~K열', note: '자막 가독' },
      ...overrides,
    } as Parameters<typeof reportService.create>[0],
    { sessionHash, now: now() },
  );
  if (!result.ok) throw new Error(`시드 제보 생성 실패: ${result.code}`);
  return result.id;
}

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
});

describe('관리자 제보 목록·상세', () => {
  it('인증 없으면 401', async () => {
    const res = await listGet(new Request(url));
    expect(res.status).toBe(401);
    const bad = await patch(1, { action: 'under_review' }, { 'content-type': 'application/json' });
    expect(bad.status).toBe(401);
  });

  it('목록은 상태 필터를 지원하고 이메일·세션 해시를 노출하지 않는다', async () => {
    const id = await seedReport({ contactEmail: 'private@example.com' }, 'session-list');
    const res = await listGet(new Request(`${url}?status=submitted`, { headers: auth }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.reports.find((r: { id: number }) => r.id === id);
    expect(row).toBeDefined();
    expect(row.contact_email).toBeUndefined();
    expect(row.anonymous_session_hash).toBeUndefined();
  });

  it('상세: 없는 제보 404', async () => {
    const res = await detailGet(new Request(`${url}/99999`, { headers: auth }), {
      params: Promise.resolve({ id: '99999' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('검토 상태 전이', () => {
  it('under_review → rejected 시 resolution이 남는다', async () => {
    const id = await seedReport({}, 'session-review');
    const r1 = await patch(id, { action: 'under_review' });
    expect(r1.status).toBe(200);
    const r2 = await patch(id, { action: 'rejected', note: '증빙 불충분' });
    expect(r2.status).toBe(200);
    const report = await reportService.get(id);
    expect(report?.status).toBe('rejected');
    expect(report?.resolution).toBe('증빙 불충분');
  });

  it('알 수 없는 액션은 400', async () => {
    const id = await seedReport({}, 'session-badaction');
    const res = await patch(id, { action: 'delete_everything' });
    expect(res.status).toBe(400);
  });
});

describe('관찰 기록 승인 — 신뢰도 상한', () => {
  it('증빙 없는 단일 제보는 0.55로 캡', async () => {
    const id = await seedReport({ reportType: 'auditorium_spec', claimedValue: { field: 'screen.aspect' } }, 'cap-1');
    const res = await patch(id, { action: 'approve_observation', field: 'screen.aspect', confidence: 0.95 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confidence).toBe(REPORT_CONFIDENCE_CAPS.singleUserReport);
    const obs = await getAppDbClient().query<{ info_status: string; confidence: number }>(
      `SELECT info_status, confidence FROM observations WHERE id = ?`,
      [body.observationId],
    );
    expect(obs[0].info_status).toBe('user_report'); // official 승격 금지
    expect(obs[0].confidence).toBe(REPORT_CONFIDENCE_CAPS.singleUserReport);
    expect((await reportService.get(id))?.status).toBe('approved_as_observation');
  });

  it('증빙 URL이 있으면 0.65로 캡', async () => {
    const id = await seedReport(
      { reportType: 'renovation', evidenceUrl: 'https://example.com/notice', claimedValue: { note: '리뉴얼' } },
      'cap-2',
    );
    const res = await patch(id, { action: 'approve_observation', field: 'renovation.note', confidence: 0.9 });
    const body = await res.json();
    expect(body.confidence).toBe(REPORT_CONFIDENCE_CAPS.singleWithEvidence);
  });

  it('서로 다른 세션 복수 제보 일치는 0.75로 캡', async () => {
    await seedReport({ targetId: 2 }, 'multi-a');
    const id = await seedReport({ targetId: 2 }, 'multi-b');
    const res = await patch(id, { action: 'approve_observation', field: 'seat_zone', confidence: 0.99 });
    const body = await res.json();
    expect(body.confidence).toBe(REPORT_CONFIDENCE_CAPS.multipleIndependent);
  });

  it('반려된 제보는 승격 불가', async () => {
    const id = await seedReport({}, 'cap-rejected');
    await patch(id, { action: 'rejected', note: '재현 불가' });
    const res = await patch(id, { action: 'approve_observation', field: 'seat_zone', confidence: 0.5 });
    expect(res.status).toBe(422);
  });
});

describe('좌석 존 승격 — 계보', () => {
  it('좌석 구역 제보가 아니면 거부', async () => {
    const id = await seedReport({ reportType: 'booking_link', claimedValue: { url: 'x' } }, 'zone-wrongtype');
    const res = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['subtitle'],
      rationale: '자막 가독 제보',
      confidence: 0.6,
    });
    expect(res.status).toBe(422);
  });

  it('승격 시 새 존이 활성으로 추가되고 제보는 promoted가 된다', async () => {
    const id = await seedReport({}, 'zone-new');
    const res = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['subtitle', 'neck_easy'],
      rowRange: 'J~K열',
      colRange: '중앙 블록',
      rationale: '복수 제보 일치 — 자막 가독·목 편안',
      confidence: 0.9,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seatZoneId).toBeGreaterThan(0);

    const zones = await seatZoneRepository.listByAuditorium(1);
    const added = zones.find((z) => z.rowRange === 'J~K열' && z.purposes.includes('subtitle'));
    expect(added).toBeDefined();
    expect(added?.infoStatus).toBe('user_report');
    expect(added?.confidence).toBeLessThanOrEqual(REPORT_CONFIDENCE_CAPS.multipleIndependent);

    const report = await reportService.get(id);
    expect(report?.status).toBe('promoted');
    expect(report?.promoted_entity_type).toBe('seat_zone');
    expect(report?.promoted_entity_id).toBe(body.seatZoneId);
    expect(report?.promoted_observation_id).toBeGreaterThan(0);
  });

  it('supersedes 지정 시 기존 존은 비활성(valid_to)되고 조회에서 빠진다', async () => {
    const db = getAppDbClient();
    const prev = await db.query<{ id: number }>(
      `SELECT id FROM seat_zones WHERE auditorium_id = 1 AND is_active = 1 ORDER BY id LIMIT 1`,
    );
    const prevId = prev[0].id;

    const id = await seedReport({}, 'zone-supersede');
    const res = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['immersive', 'sound'],
      rowRange: 'K~L열',
      rationale: '리뉴얼 후 몰입 구역 갱신 제보',
      confidence: 0.7,
      supersedesSeatZoneId: prevId,
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    const old = await db.query<{ is_active: number; valid_to: string | null }>(
      `SELECT is_active, valid_to FROM seat_zones WHERE id = ?`,
      [prevId],
    );
    expect(old[0].is_active).toBe(0);
    expect(old[0].valid_to).not.toBeNull();

    const fresh = await db.query<{ supersedes_seat_zone_id: number }>(
      `SELECT supersedes_seat_zone_id FROM seat_zones WHERE id = ?`,
      [body.seatZoneId],
    );
    expect(fresh[0].supersedes_seat_zone_id).toBe(prevId);

    const zoneIds = await db.query<{ id: number }>(
      `SELECT id FROM seat_zones WHERE auditorium_id = 1 AND is_active = 1`,
    );
    expect(zoneIds.map((z) => z.id)).not.toContain(prevId);
  });

  it('다른 상영관의 존은 supersedes 대상이 될 수 없다', async () => {
    const db = getAppDbClient();
    const other = await db.query<{ id: number }>(
      `SELECT id FROM seat_zones WHERE auditorium_id <> 1 AND is_active = 1 LIMIT 1`,
    );
    const id = await seedReport({}, 'zone-crossaud');
    const res = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['immersive'],
      rationale: '교차 상영관 대체 시도',
      confidence: 0.6,
      supersedesSeatZoneId: other[0].id,
    });
    expect(res.status).toBe(422);
  });

  it('promoted 제보는 재승격·상태 변경 불가, 사전 승인된 관찰은 재사용된다', async () => {
    const id = await seedReport({}, 'zone-twostep');
    const approve = await patch(id, { action: 'approve_observation', field: 'seat_zone', confidence: 0.6 });
    const approveBody = await approve.json();

    const promote = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['immersive'],
      rationale: '사전 승인 후 승격',
      confidence: 0.6,
    });
    expect(promote.status).toBe(200);
    const promoteBody = await promote.json();
    expect(promoteBody.observationId).toBe(approveBody.observationId); // 관찰 재사용 — 중복 생성 금지

    const again = await patch(id, {
      action: 'promote_seat_zone',
      purposes: ['immersive'],
      rationale: '중복 승격 시도',
      confidence: 0.6,
    });
    expect(again.status).toBe(422);
    const review = await patch(id, { action: 'rejected', note: '되돌리기 시도' });
    expect(review.status).toBe(422);
  });

  it('승격은 audit_logs에 남는다', async () => {
    const logs = await getAppDbClient().query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'report_promoted_seat_zone'`,
    );
    expect(Number(logs[0].n)).toBeGreaterThanOrEqual(2);
  });
});

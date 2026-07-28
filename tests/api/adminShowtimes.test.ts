// 관리자 API 회귀 테스트 — 임시 DB에 직접 시드 (원본 파일 복사는 다른 워커의 쓰기와
// 경쟁해 malformed 사본이 생길 수 있어 금지)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.ADMIN_PASSWORD = 'test-admin-pw';
process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-admin-')), 'admin-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo'; // now = 2026-07-27T12:00+09:00 — 과거 날짜 검증 결정적

import { createAdminToken } from '../../src/lib/adminAuth';
import { POST as loginPost } from '../../app/api/admin/login/route';
import { GET as listGet, POST as createPost } from '../../app/api/admin/showtimes/route';
import { GET as detailGet, PATCH as patchRoute } from '../../app/api/admin/showtimes/[id]/route';

const TOKEN = createAdminToken('test-admin-pw');
const auth = { 'x-admin-token': TOKEN, 'content-type': 'application/json' };
const url = 'http://localhost/api/admin/showtimes';

const validBody = (overrides: Record<string, unknown> = {}) => ({
  movieId: 1,
  auditoriumId: 1, // CGV 용산 IMAX관 (brand imax)
  date: '2026-08-01',
  startTime: '19:30',
  format: 'imax',
  price: 30000,
  bookingUrl: 'https://ticket.cgv.co.kr/test',
  sourceNote: '공식 예매 페이지 확인(테스트)',
  isSynthetic: false,
  ...overrides,
});

const post = (body: unknown, headers: Record<string, string> = auth) =>
  createPost(new Request(url, { method: 'POST', headers, body: JSON.stringify(body) }));

const patch = (id: number, body: unknown) =>
  patchRoute(new Request(`${url}/${id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: String(id) }),
  });

beforeAll(() => {
  // 임시 경로에 격리 시드 (CINEFIT_DB_PATH는 파일 상단에서 설정됨)
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
});

describe('관리자 인증', () => {
  it('로그인: 틀린 비밀번호 401, 맞으면 쿠키 발급', async () => {
    const bad = await loginPost(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      }),
    );
    expect(bad.status).toBe(401);

    const good = await loginPost(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'test-admin-pw' }),
      }),
    );
    expect(good.status).toBe(200);
    expect(good.headers.get('set-cookie')).toContain('cinefit_admin=');
  });

  it('토큰 없는 요청은 401', async () => {
    expect((await listGet(new Request(url))).status).toBe(401);
    expect((await post(validBody(), { 'content-type': 'application/json' })).status).toBe(401);
  });
});

describe('회차 생성·수정·비활성화', () => {
  it('정상 생성 201 후 목록·상세 조회 가능', async () => {
    const res = await post(validBody());
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: number };

    const list = await listGet(new Request(`${url}?synthetic=verified`, { headers: auth }));
    const rows = ((await list.json()) as { showtimes: { id: number }[] }).showtimes;
    expect(rows.some((r) => r.id === id)).toBe(true);

    const detail = await detailGet(new Request(`${url}/${id}`, { headers: auth }), {
      params: Promise.resolve({ id: String(id) }),
    });
    const body = (await detail.json()) as { changes: { action: string }[] };
    expect(body.changes.map((c) => c.action)).toContain('create');
  });

  it('중복 회차 422', async () => {
    const res = await post(validBody({ sourceNote: '중복 시도' }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { details: string[] };
    expect(body.details[0]).toContain('이미 존재');
  });

  it('잘못된 가격·URL은 400', async () => {
    expect((await post(validBody({ price: -1, startTime: '21:00' }))).status).toBe(400);
    expect((await post(validBody({ bookingUrl: 'ftp://nope', startTime: '21:00' }))).status).toBe(400);
  });

  it('존재하지 않는 영화·상영관은 422', async () => {
    expect((await post(validBody({ movieId: 999, startTime: '21:30' }))).status).toBe(422);
    expect((await post(validBody({ auditoriumId: 999, startTime: '21:30' }))).status).toBe(422);
  });

  it('과거 시각 회차는 422 (demo clock 2026-07-27 기준)', async () => {
    const res = await post(validBody({ date: '2026-07-01', startTime: '19:00' }));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { details: string[] };
    expect(body.details[0]).toContain('과거');
  });

  it('상영관 브랜드와 불가능한 포맷은 422 (일반관에 IMAX)', async () => {
    const res = await post(validBody({ auditoriumId: 2, startTime: '22:00' })); // 용산 13관 standard
    expect(res.status).toBe(422);
  });

  it('배급 버전에 없는 포맷은 근거 없이 422, 근거 있으면 경고와 함께 저장', async () => {
    // 영화 3(존 오브 인터레스트)의 KOBIS 배급 버전에는 dolby_cinema 없음… 시드 상태에 따라
    // 레거시 스펙일 수 있으므로 4dx로 검증: 시드 스펙 format_versions에 4dx 없음
    const noNote = await post(validBody({ movieId: 3, auditoriumId: 9, format: '4dx', startTime: '18:00' }));
    expect(noNote.status).toBe(422);
    expect(((await noNote.json()) as { needsMismatchNote?: boolean }).needsMismatchNote).toBe(true);

    const withNote = await post(
      validBody({
        movieId: 3,
        auditoriumId: 9,
        format: '4dx',
        startTime: '18:00',
        mismatchNote: '극장 공지에서 4DX 특별 상영 확인 (테스트)',
      }),
    );
    expect(withNote.status).toBe(201);
    expect(((await withNote.json()) as { warnings: string[] }).warnings.length).toBeGreaterThan(0);
  });

  it('수정(PATCH)과 비활성화가 동작하고 이력이 남는다', async () => {
    const created = await post(validBody({ startTime: '23:00', crossesMidnight: false }));
    const { id } = (await created.json()) as { id: number };

    const updated = await patch(id, validBody({ startTime: '23:15', price: 28000 }));
    expect(updated.status).toBe(200);

    const disabled = await patch(id, { status: 'disabled' });
    expect(disabled.status).toBe(200);

    const detail = await detailGet(new Request(`${url}/${id}`, { headers: auth }), {
      params: Promise.resolve({ id: String(id) }),
    });
    const body = (await detail.json()) as { showtime: { status: string }; changes: { action: string }[] };
    expect(body.showtime.status).toBe('disabled');
    expect(body.changes.map((c) => c.action)).toEqual(expect.arrayContaining(['create', 'update', 'disable']));
  });

  it('존재하지 않는 회차 PATCH는 404', async () => {
    expect((await patch(99_999, { status: 'disabled' })).status).toBe(404);
  });
});

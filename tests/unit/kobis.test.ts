// KOBIS 어댑터 단위 테스트 — 외부 API 호출 없이 fixture·mock fetch 사용
import { describe, expect, it } from 'vitest';
import { KobisClient, KobisError } from '../../src/data/adapters/kobis/kobisClient.ts';
import { mapBoxOffice, mapMovieInfo, normalizeShowTypes } from '../../src/data/adapters/kobis/kobisMapper.ts';
import { movieInfoResponseSchema } from '../../src/data/adapters/kobis/kobisSchemas.ts';

const movieInfoFixture = (overrides: Record<string, unknown> = {}) => ({
  movieInfoResult: {
    movieInfo: {
      movieCd: '20236295',
      movieNm: '듄: 파트2',
      movieNmEn: 'Dune: Part Two',
      showTm: '165',
      prdtYear: '2024',
      openDt: '20240228',
      genres: [{ genreNm: '액션' }],
      directors: [{ peopleNm: '드니 빌뇌브' }],
      audits: [{ watchGradeNm: '12세이상관람가' }],
      showTypes: [
        { showTypeGroupNm: '2D', showTypeNm: '디지털' },
        { showTypeGroupNm: '4D', showTypeNm: '4D' },
        { showTypeGroupNm: 'IMAX', showTypeNm: 'IMAX' },
        { showTypeGroupNm: 'ScreenX', showTypeNm: 'ScreenX' },
        { showTypeGroupNm: 'DOLBYCINEMA', showTypeNm: 'DOLBYCINEMA' },
      ],
      ...overrides,
    },
  },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const clientWith = (fetchFn: typeof fetch, opts: Partial<ConstructorParameters<typeof KobisClient>[0]> = {}) =>
  new KobisClient({ apiKey: 'test-key', fetchFn, minIntervalMs: 0, retries: 2, ...opts });

describe('KOBIS 매퍼', () => {
  it('정상 영화 상세를 정규화한다', () => {
    const m = mapMovieInfo(movieInfoResponseSchema.parse(movieInfoFixture()));
    expect(m).toMatchObject({
      kobisCode: '20236295',
      title: '듄: 파트2',
      runtimeMin: 165,
      prodYear: 2024,
      openDate: '2024-02-28',
      rating: '12세이상관람가',
      directors: ['드니 빌뇌브'],
    });
  });

  it('showTypes 다중 포맷을 정규화하고 원문을 보존한다', () => {
    const formats = mapMovieInfo(movieInfoResponseSchema.parse(movieInfoFixture())).formats;
    expect(formats.map((f) => f.normalized)).toEqual(['standard', '4dx', 'imax', 'screenx', 'dolby_cinema']);
    expect(formats.map((f) => f.raw)).toContain('IMAX/IMAX');
  });

  it('미매핑 포맷은 raw를 보존하고 normalized=null, 중복은 제거한다', () => {
    const entries = normalizeShowTypes([
      { showTypeGroupNm: 'IMAX', showTypeNm: 'IMAX' },
      { showTypeGroupNm: 'IMAX', showTypeNm: 'IMAX' }, // 중복
      { showTypeGroupNm: 'ULTRA4DX', showTypeNm: 'U4DX' }, // 미매핑
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toEqual({ raw: 'ULTRA4DX/U4DX', normalized: null });
  });

  it('필드 누락·빈 배열을 기본값으로 처리한다', () => {
    const m = mapMovieInfo(
      movieInfoResponseSchema.parse(
        movieInfoFixture({ showTm: '', prdtYear: '', openDt: '', showTypes: [], audits: [], directors: [] }),
      ),
    );
    expect(m.runtimeMin).toBeNull();
    expect(m.prodYear).toBeNull();
    expect(m.openDate).toBeNull();
    expect(m.rating).toBeNull();
    expect(m.formats).toEqual([]);
  });
});

describe('KOBIS 클라이언트', () => {
  it('정상 응답을 파싱한다', async () => {
    const client = clientWith(async () => jsonResponse(movieInfoFixture()));
    const res = await client.movieInfo('20236295');
    expect(res.movieInfoResult.movieInfo.movieNm).toBe('듄: 파트2');
  });

  it('빈 박스오피스 목록을 처리한다', async () => {
    const client = clientWith(async () =>
      jsonResponse({ boxOfficeResult: { dailyBoxOfficeList: [] } }),
    );
    expect(mapBoxOffice(await client.dailyBoxOffice('20260726'))).toEqual([]);
  });

  it('형식이 다른 응답은 parse 오류를 던진다', async () => {
    const client = clientWith(async () => jsonResponse({ unexpected: true }));
    await expect(client.movieInfo('1')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('faultInfo 응답은 fault 오류를 던진다', async () => {
    const client = clientWith(async () =>
      jsonResponse({ faultInfo: { message: '유효하지않은 키값입니다.', errorCode: '320010' } }),
    );
    await expect(client.movieInfo('1')).rejects.toMatchObject({ kind: 'fault' });
  });

  it('5xx는 재시도 후 http 오류를 던진다', async () => {
    let calls = 0;
    const client = clientWith(async () => {
      calls++;
      return new Response('oops', { status: 500 });
    });
    await expect(client.movieInfo('1')).rejects.toBeInstanceOf(KobisError);
    expect(calls).toBe(3); // 최초 1 + 재시도 2
  });

  it('타임아웃은 timeout 오류로 분류된다', async () => {
    const client = clientWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('timed out');
            e.name = 'TimeoutError';
            reject(e);
          });
        }),
      { timeoutMs: 20, retries: 0 },
    );
    await expect(client.movieInfo('1')).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('키가 없으면 생성 시점에 실패한다', () => {
    expect(() => new KobisClient({ apiKey: '' })).toThrow(KobisError);
  });
});

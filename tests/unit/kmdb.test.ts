// KMDb 어댑터 단위 테스트 — 외부 API 호출 없이 fixture·mock fetch 사용
import { describe, expect, it } from 'vitest';
import { KmdbClient, KmdbError } from '../../src/data/adapters/kmdb/kmdbClient.ts';
import { findResultByDocId, mapSearchCandidates, mapSearchResult } from '../../src/data/adapters/kmdb/kmdbMapper.ts';
import { kmdbSearchResponseSchema } from '../../src/data/adapters/kmdb/kmdbSchemas.ts';

const searchFixture = (overrides: Record<string, unknown> = {}) => ({
  Data: [
    {
      Count: '1',
      Result: [
        {
          DOCID: 'K-24812345',
          title: '!HS듄!HE: 파트 2',
          titleEng: 'Dune: Part Two',
          prodYear: '2024',
          runtime: '166',
          repRlsDate: '2024-02-28',
          rating: '12세이상관람가',
          directors: { director: [{ directorNm: '드니 빌뇌브' }] },
          plots: { plot: [{ plotText: '폴 아트레이데스가 폴을...' }] },
          screenArea: '2.39:1',
          soundEcho: 'Dolby Atmos',
          fSound: '',
          ...overrides,
        },
      ],
    },
  ],
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const clientWith = (fetchFn: typeof fetch, opts: Partial<ConstructorParameters<typeof KmdbClient>[0]> = {}) =>
  new KmdbClient({ apiKey: 'test-key', fetchFn, minIntervalMs: 0, retries: 2, ...opts });

describe('KMDb 매퍼', () => {
  it('정상 검색 결과를 정규화하고 !HS/!HE 하이라이트 마커를 제거한다', () => {
    const res = kmdbSearchResponseSchema.parse(searchFixture());
    const m = mapSearchResult(res.Data[0]!.Result[0]!);
    expect(m).toMatchObject({
      docId: 'K-24812345',
      title: '듄: 파트 2',
      titleEng: 'Dune: Part Two',
      prodYear: 2024,
      runtimeMin: 166,
      repRlsDate: '2024-02-28',
      rating: '12세이상관람가',
      directors: ['드니 빌뇌브'],
    });
    expect(m.plotSummary).toContain('폴 아트레이데스');
  });

  it('채워진 기술 필드만 원문 그대로 담고, 빈 필드는 제외한다(해석 없음)', () => {
    const res = kmdbSearchResponseSchema.parse(searchFixture());
    const m = mapSearchResult(res.Data[0]!.Result[0]!);
    expect(m.technicalFields).toEqual([
      { key: 'screen_area', rawValue: '2.39:1' },
      { key: 'sound_echo', rawValue: 'Dolby Atmos' },
    ]);
  });

  it('기술 필드가 전부 비어 있으면 빈 배열이다(추정으로 채우지 않는다)', () => {
    const res = kmdbSearchResponseSchema.parse(
      searchFixture({ screenArea: '', soundEcho: '', fSound: '' }),
    );
    expect(mapSearchResult(res.Data[0]!.Result[0]!).technicalFields).toEqual([]);
  });

  it('repRlsDate 형식이 다르면 null로 처리한다(추정 금지)', () => {
    const res = kmdbSearchResponseSchema.parse(searchFixture({ repRlsDate: '20240228' }));
    expect(mapSearchResult(res.Data[0]!.Result[0]!).repRlsDate).toBeNull();
  });

  it('필드 누락은 기본값으로 처리한다', () => {
    const res = kmdbSearchResponseSchema.parse(
      searchFixture({ runtime: '', prodYear: '', repRlsDate: '', rating: '', directors: { director: [] }, plots: { plot: [] } }),
    );
    const m = mapSearchResult(res.Data[0]!.Result[0]!);
    expect(m.runtimeMin).toBeNull();
    expect(m.prodYear).toBeNull();
    expect(m.rating).toBeNull();
    expect(m.directors).toEqual([]);
    expect(m.plotSummary).toBeNull();
  });

  it('여러 후보를 검색 후보 목록으로 매핑한다', () => {
    const res = kmdbSearchResponseSchema.parse({
      Data: [{ Result: [searchFixture().Data[0]!.Result[0], { ...searchFixture().Data[0]!.Result[0], DOCID: 'K-2' }] }],
    });
    expect(mapSearchCandidates(res)).toHaveLength(2);
  });

  it('DOCID로 특정 결과를 찾는다', () => {
    const res = kmdbSearchResponseSchema.parse(searchFixture());
    expect(findResultByDocId(res, 'K-24812345')?.title).toContain('듄');
    expect(findResultByDocId(res, '없음')).toBeNull();
  });
});

describe('KMDb 클라이언트', () => {
  it('정상 응답을 파싱한다', async () => {
    const client = clientWith(async () => jsonResponse(searchFixture()));
    const res = await client.searchByTitle('듄: 파트 2');
    expect(res.Data[0]?.Result[0]?.DOCID).toBe('K-24812345');
  });

  it('빈 결과를 처리한다', async () => {
    const client = clientWith(async () => jsonResponse({ Data: [{ Count: '0', Result: [] }] }));
    const res = await client.searchByTitle('존재하지않는영화');
    expect(res.Data[0]?.Result).toEqual([]);
  });

  it('형식이 다른 응답은 parse 오류를 던진다', async () => {
    const client = clientWith(async () => jsonResponse({ unexpected: true }));
    await expect(client.searchByTitle('x')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('5xx는 재시도 후 http 오류를 던진다', async () => {
    let calls = 0;
    const client = clientWith(async () => {
      calls++;
      return new Response('oops', { status: 500 });
    });
    await expect(client.searchByTitle('x')).rejects.toBeInstanceOf(KmdbError);
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
    await expect(client.searchByTitle('x')).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('키가 없으면 생성 시점에 실패한다', () => {
    expect(() => new KmdbClient({ apiKey: '' })).toThrow(KmdbError);
  });
});

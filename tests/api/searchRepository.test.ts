// searchRepository 회귀 테스트 — 임시 DB에 실제 시드+별칭 데이터로 검증한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-search-')), 'search-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { searchRepository } from '../../src/data/searchRepository';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });
});

describe('영화 검색', () => {
  it('제목 일부로 찾는다', async () => {
    const { movies } = await searchRepository.search('오펜하이머');
    expect(movies.some((m) => m.title === '오펜하이머')).toBe(true);
  });

  it('원제로도 찾는다', async () => {
    const { movies } = await searchRepository.search('Oppenheimer');
    expect(movies.length).toBeGreaterThan(0);
  });

  it('별칭("듄2")으로 찾으면 matchedAlias가 채워진다', async () => {
    const { movies } = await searchRepository.search('듄2');
    const match = movies.find((m) => m.title === '듄: 파트 2');
    expect(match).toBeDefined();
    expect(match?.matchedAlias).toBe('듄2');
  });

  it('영화 검색 결과에 상영관은 섞이지 않는다', async () => {
    const { movies, cinemas } = await searchRepository.search('오펜하이머');
    expect(movies.length).toBeGreaterThan(0);
    expect(cinemas).toHaveLength(0);
  });
});

describe('상영관 검색', () => {
  it('상영관 이름 일부로 찾는다', async () => {
    const { cinemas } = await searchRepository.search('코엑스');
    expect(cinemas.some((c) => c.locationName.includes('코엑스'))).toBe(true);
  });

  it('별칭("용아맥")으로 찾으면 matchedAlias가 채워진다', async () => {
    const { cinemas } = await searchRepository.search('용아맥');
    const match = cinemas.find((c) => c.locationName === 'CGV 용산아이파크몰');
    expect(match).toBeDefined();
    expect(match?.matchedAlias).toBe('용아맥');
  });

  it('체인 이름으로 찾는다', async () => {
    const { cinemas } = await searchRepository.search('메가박스');
    expect(cinemas.length).toBeGreaterThan(0);
    expect(cinemas.every((c) => c.brand)).toBe(true);
  });

  it('지역 코드로 찾는다', async () => {
    const { cinemas } = await searchRepository.search('SEOUL_METRO');
    expect(cinemas.length).toBeGreaterThan(0);
  });
});

describe('경계 조건', () => {
  it('빈 문자열이면 아무것도 반환하지 않는다', async () => {
    const result = await searchRepository.search('   ');
    expect(result).toEqual({ movies: [], cinemas: [] });
  });

  it('일치하는 것이 없으면 빈 배열을 반환한다', async () => {
    const result = await searchRepository.search('존재하지않는검색어zzz');
    expect(result.movies).toHaveLength(0);
    expect(result.cinemas).toHaveLength(0);
  });
});

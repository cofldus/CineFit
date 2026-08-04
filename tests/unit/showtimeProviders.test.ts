// 회차 공급원 계약(R18) — admin 공급원이 기존 showtimeRepository 결과를 그대로 전달하고,
// 레지스트리가 공급원 실패를 격리·중복을 제거하는지 검증한다. 이 계약이 지켜지는 한
// 공급원 계층 도입은 추천 파이프라인의 동작을 바꾸지 않는다.
import { describe, expect, it } from 'vitest';
import { createAdminVerifiedProvider } from '../../src/data/showtimeProviders/adminVerifiedProvider';
import { createShowtimeSourceRegistry } from '../../src/data/showtimeProviders/registry';
import type { ShowtimeProvider } from '../../src/data/showtimeProviders/types';
import { makeCandidate } from '../fixtures';

const QUERY = { movieId: 1, date: '2026-07-28' };

describe('adminVerifiedProvider', () => {
  it('listCandidates 결과를 변형 없이 전달하고, 내부 원본이므로 expiresAt은 null이다', async () => {
    const candidates = [makeCandidate(), makeCandidate({ format: 'standard', price: 15_000 })];
    const calls: [number, string][] = [];
    const provider = createAdminVerifiedProvider({
      async listCandidates(movieId, date) {
        calls.push([movieId, date]);
        return candidates;
      },
    });

    const result = await provider.fetch(QUERY);

    expect(calls).toEqual([[1, '2026-07-28']]);
    expect(result.candidates).toBe(candidates);
    expect(result.expiresAt).toBeNull();
    expect(result.checkedAt).toBeTruthy();
  });
});

describe('showtimeSourceRegistry', () => {
  const stub = (id: string, candidates: ReturnType<typeof makeCandidate>[]): ShowtimeProvider => ({
    id,
    label: id,
    fetch: async () => ({ candidates, checkedAt: '2026-07-27T12:00:00+09:00', expiresAt: null }),
  });

  it('한 공급원의 실패는 그 공급원만 비우고 나머지는 계속 동작한다', async () => {
    const ok = makeCandidate();
    const failing: ShowtimeProvider = {
      id: 'broken',
      label: 'broken',
      fetch: async () => {
        throw new Error('provider down');
      },
    };
    const registry = createShowtimeSourceRegistry([failing, stub('admin_verified', [ok])]);

    const merged = await registry.fetchShowtimes(QUERY);

    expect(merged.candidates).toEqual([ok]);
    expect(merged.sources).toEqual([
      { id: 'broken', label: 'broken', ok: false, count: 0, checkedAt: null },
      { id: 'admin_verified', label: 'admin_verified', ok: true, count: 1, checkedAt: '2026-07-27T12:00:00+09:00' },
    ]);
  });

  it('같은 showtimeId가 여러 공급원에서 오면 먼저 등록된 공급원 것을 유지한다', async () => {
    const first = makeCandidate();
    const duplicate = { ...makeCandidate(), showtimeId: first.showtimeId };
    const registry = createShowtimeSourceRegistry([stub('admin_verified', [first]), stub('external', [duplicate])]);

    const merged = await registry.fetchShowtimes(QUERY);

    expect(merged.candidates).toHaveLength(1);
    expect(merged.candidates[0]).toBe(first);
  });
});

// 공급원 레지스트리 — 등록된 모든 공급원에서 후보를 모아 회차 ID 기준으로 병합한다.
// 지금은 admin 공급원 하나뿐이라 결과가 showtimeRepository.listCandidates와 동일하다
// (계약 테스트가 이를 보증한다). 극장사 승낙 후 어댑터를 추가하면:
// - 한 공급원의 실패는 그 공급원만 비우고 나머지는 계속 동작한다
// - 같은 회차가 여러 공급원에서 오면 먼저 등록된(내부 admin) 확인본을 우선한다
import type { CandidateShowtime } from '../../domain/recommendation/types';
import { adminVerifiedProvider } from './adminVerifiedProvider';
import type { ShowtimeProvider, ShowtimeQuery } from './types';

export interface MergedShowtimes {
  candidates: CandidateShowtime[];
  /** 공급원별 상태 — 화면·로그에서 "어느 출처가 실패했는지"를 숨기지 않기 위함. */
  sources: { id: string; label: string; ok: boolean; count: number; checkedAt: string | null }[];
}

export function createShowtimeSourceRegistry(providers: ShowtimeProvider[]) {
  return {
    async fetchShowtimes(query: ShowtimeQuery): Promise<MergedShowtimes> {
      const results = await Promise.all(
        providers.map(async (p) => {
          try {
            const r = await p.fetch(query);
            return { provider: p, ok: true as const, result: r };
          } catch {
            return { provider: p, ok: false as const, result: null };
          }
        }),
      );

      const seen = new Set<number>();
      const candidates: CandidateShowtime[] = [];
      for (const r of results) {
        if (!r.ok || !r.result) continue;
        for (const c of r.result.candidates) {
          if (seen.has(c.showtimeId)) continue;
          seen.add(c.showtimeId);
          candidates.push(c);
        }
      }

      return {
        candidates,
        sources: results.map((r) => ({
          id: r.provider.id,
          label: r.provider.label,
          ok: r.ok,
          count: r.ok && r.result ? r.result.candidates.length : 0,
          checkedAt: r.ok && r.result ? r.result.checkedAt : null,
        })),
      };
    },
  };
}

export const showtimeSourceRegistry = createShowtimeSourceRegistry([adminVerifiedProvider]);

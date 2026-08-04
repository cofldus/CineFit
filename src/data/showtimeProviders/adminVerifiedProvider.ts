// 첫 번째(그리고 승낙 전까지 유일한) 회차 공급원 — 관리자가 공식 예매 페이지에서 직접
// 확인해 등록한 회차. 기존 showtimeRepository.listCandidates를 그대로 위임하므로 추천
// 파이프라인의 동작을 바꾸지 않는다. 극장사 승낙을 받으면 같은 인터페이스로 cgv/lotte
// 어댑터를 추가하고 레지스트리에서 병합한다.
import { getAppClock } from '../../lib/clock';
import type { CandidateShowtime } from '../../domain/recommendation/types';
import { showtimeRepository } from '../showtimeRepository';
import type { ShowtimeProvider, ShowtimeProviderResult, ShowtimeQuery } from './types';

interface CandidateSource {
  listCandidates(movieId: number, date: string): Promise<CandidateShowtime[]>;
}

export function createAdminVerifiedProvider(source: CandidateSource): ShowtimeProvider {
  return {
    id: 'admin_verified',
    label: '관리자 확인 회차',
    async fetch(query: ShowtimeQuery): Promise<ShowtimeProviderResult> {
      const candidates = await source.listCandidates(query.movieId, query.date);
      return {
        candidates,
        checkedAt: getAppClock().now().toISOString(),
        expiresAt: null, // 내부 DB가 원본 — TTL 캐시는 외부 공급원 전용
      };
    },
  };
}

export const adminVerifiedProvider = createAdminVerifiedProvider(showtimeRepository);

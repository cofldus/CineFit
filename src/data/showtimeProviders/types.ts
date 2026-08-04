// 회차 공급원(ShowtimeProvider) 계약 — R18에서 확정한 "요청 시 최소 참조" 아키텍처의
// 뼈대다. CineFit은 전국 상영시간표 마스터 DB를 만들지 않는다: 공급원은 사용자의 조건
// (영화·날짜)에 필요한 후보만 반환하고, 외부 공급원이 생기면 짧은 TTL 캐시로만 보관한다
// (축적·재판매 없음). 극장사 공급원은 데이터 이용 승낙을 받은 뒤에만 추가한다 — 승낙 전
// 유일한 공급원은 관리자가 공식 페이지에서 확인해 등록한 회차다.
import type { CandidateShowtime } from '../../domain/recommendation/types';

export interface ShowtimeQuery {
  movieId: number;
  /** YYYY-MM-DD (Asia/Seoul) */
  date: string;
}

export interface ShowtimeProviderResult {
  candidates: CandidateShowtime[];
  /** 이 응답을 언제 확인했는지 — 화면의 "마지막 확인 시각" 표기에 쓴다. */
  checkedAt: string;
  /** 외부 공급원의 캐시 만료 시각(ISO). 내부(admin) 공급원은 null — DB가 원본이다. */
  expiresAt: string | null;
}

export interface ShowtimeProvider {
  /** 안정 식별자 — citation·로그에 남는다. */
  readonly id: string;
  /** 사용자 화면에 표기할 출처 이름. */
  readonly label: string;
  /**
   * 조건에 맞는 후보 회차를 반환한다. 구현 규칙:
   * - 요청 조건에 필요한 범위만 조회한다(전체 시간표 미러링 금지)
   * - 실패 시 throw — 레지스트리가 공급원 단위로 격리한다(한 공급원 장애가 전체를 막지 않게)
   * - 반환 데이터에는 공식 예매 URL·확인 시각을 반드시 포함한다
   */
  fetch(query: ShowtimeQuery): Promise<ShowtimeProviderResult>;
}

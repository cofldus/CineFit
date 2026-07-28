// 지금 실제 추천에 쓰이는 정책 — 여기 한 곳만 바꾸면 서비스 전체가 새 정책을 쓴다.
// 평가 CLI(npm run eval:recommendations -- --compare=v1,v2)는 이 값과 무관하게 원하는
// 정책을 직접 골라 비교할 수 있다.
import { POLICY_V1 } from './v1';

export const ACTIVE_POLICY = POLICY_V1;

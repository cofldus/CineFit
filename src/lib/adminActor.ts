// R21.1 §5 — 감사 기록(actor)의 단일 출처. 현재 인증 모델은 ADMIN_PASSWORD 기반의
// "단일 공유 관리자"라 개별 식별자가 없다 — 모든 쓰기 경로가 이 헬퍼를 거치게 해서,
// 개별 관리자 계정을 도입할 때 여기 한 곳만 바꾸면 전체 이력이 따라오게 한다.
// (isAdminRequest 통과 = 인증된 관리자라는 전제에서만 호출할 것.)

export function adminActor(): string {
  return 'admin';
}

/** CSV import 등 하위 채널 표기 — 'admin(csv)' 형태로 이력에 남긴다. */
export function adminActorVia(channel: string): string {
  return `${adminActor()}(${channel})`;
}

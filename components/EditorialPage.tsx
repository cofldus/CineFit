import type { ReactNode } from 'react';

/**
 * 사용자 화면 전용 페이지 래퍼 — bg-ed-canvas/text-ed-ink를 여기서 한 번만 강제해 각 페이지가
 * 이걸 빠뜨려 이전 --bg(라이트/다크 미디어쿼리 값)가 그대로 비쳐 보이는 대비 문제를 막는다
 * (Stage 1에서 실제로 겪은 버그 — 텍스트 색만 새 토큰을 쓰고 배경은 안 바꿔서 라이트 모드
 * 브라우저에서 밝은 배경 위에 밝은 글자가 겹쳐 대비가 거의 0이 됐었다).
 */
export function EditorialPage({ className = '', children }: { className?: string; children: ReactNode }) {
  return <main className={`min-h-screen bg-ed-canvas text-ed-ink ${className}`}>{children}</main>;
}

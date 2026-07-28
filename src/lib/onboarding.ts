// 경량 온보딩 답변 — 브라우저 localStorage에만 저장한다. 서버로 전송하거나 user_preferences 같은
// 장기 프로필 테이블에 넣지 않는다(요구사항: 추천 폼 기본값을 채우는 용도로만 쓴다).
const STORAGE_KEY = 'cinefit_onboarding';

export interface OnboardingAnswers {
  priority: 'balance' | 'quality' | 'logistics';
  motionSickness: '0' | '1' | '2';
  subtitleReadability: boolean;
}

export interface OnboardingState {
  status: 'answered' | 'skipped';
  answers: OnboardingAnswers | null;
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readOnboardingState(): OnboardingState | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingState;
    if (parsed.status !== 'answered' && parsed.status !== 'skipped') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 프라이빗 모드 등으로 저장 불가 — 온보딩 프리필 없이 계속 진행(치명적이지 않음)
  }
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// vitest.config.ts는 environment: 'node'라 window가 없다 — 온보딩 저장소가 SSR/노드 환경에서
// 안전하게 no-op하는지, 그리고 브라우저 환경을 흉내 낸 최소 스텁에서 실제로 동작하는지 둘 다 검증한다.
function stubWindow() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
}

function unstubWindow() {
  delete (globalThis as unknown as { window?: unknown }).window;
}

describe('온보딩 저장소 — window가 없는 환경(SSR)', () => {
  it('읽기는 null을 반환하고 쓰기는 조용히 아무것도 하지 않는다', async () => {
    const { readOnboardingState, writeOnboardingState } = await import('../../src/lib/onboarding');
    expect(readOnboardingState()).toBeNull();
    expect(() => writeOnboardingState({ status: 'skipped', answers: null })).not.toThrow();
  });
});

describe('온보딩 저장소 — window가 있는 환경(브라우저 스텁)', () => {
  beforeEach(() => stubWindow());
  afterEach(() => unstubWindow());

  it('아무것도 저장하지 않았으면 null이다', async () => {
    const { readOnboardingState } = await import('../../src/lib/onboarding');
    expect(readOnboardingState()).toBeNull();
  });

  it('답변을 저장하면 그대로 읽힌다', async () => {
    const { readOnboardingState, writeOnboardingState } = await import('../../src/lib/onboarding');
    writeOnboardingState({
      status: 'answered',
      answers: { priority: 'quality', motionSickness: '2', subtitleReadability: true },
    });
    expect(readOnboardingState()).toEqual({
      status: 'answered',
      answers: { priority: 'quality', motionSickness: '2', subtitleReadability: true },
    });
  });

  it('건너뛰기는 answers가 null인 상태로 저장된다', async () => {
    const { readOnboardingState, writeOnboardingState } = await import('../../src/lib/onboarding');
    writeOnboardingState({ status: 'skipped', answers: null });
    expect(readOnboardingState()).toEqual({ status: 'skipped', answers: null });
  });

  it('손상된 JSON이 저장돼 있으면 null을 반환한다(예외를 던지지 않는다)', async () => {
    const { readOnboardingState } = await import('../../src/lib/onboarding');
    window.localStorage.setItem('cinefit_onboarding', '{not-json');
    expect(readOnboardingState()).toBeNull();
  });

  it('status 값이 올바르지 않으면 null을 반환한다', async () => {
    const { readOnboardingState } = await import('../../src/lib/onboarding');
    window.localStorage.setItem('cinefit_onboarding', JSON.stringify({ status: 'bogus', answers: null }));
    expect(readOnboardingState()).toBeNull();
  });
});

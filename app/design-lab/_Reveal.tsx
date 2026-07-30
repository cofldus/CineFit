'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// 세 시안이 공유하는 절제된 reveal 유틸 — 동작(behavior)만 공유하고 각 시안의 실제 마크업·
// 배치는 독립적으로 구현한다. 트랜지션은 opacity/transform만 쓰고, prefers-reduced-motion은
// globals.css의 전역 규칙(`* { transition: none !important }`)이 이미 처리하므로 여기서
// 따로 분기하지 않는다.
export function Reveal({
  children,
  className = '',
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

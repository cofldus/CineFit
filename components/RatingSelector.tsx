// 1~5점 만족도 — 문항마다 "매우 낮음 1 2 3 4 5 매우 높음"을 반복하는 해외형 Likert 표기
// 대신, 하나로 이어진 가로 세그먼트 바 하나로 압축한다(브리프: "한국 모바일 서비스 같은
// 컴팩트한 정보 밀도"). 양 끝 설명은 이 컴포넌트가 아니라 폼 상단에서 한 번만 안내한다.
export function RatingSelector({
  name,
  label,
  required = false,
  value,
  onChange,
  size = 'sm',
}: {
  name: string;
  label: string;
  required?: boolean;
  value: number | undefined;
  onChange: (n: number) => void;
  size?: 'sm' | 'lg';
}) {
  return (
    <div className="flex flex-col gap-2 py-2.5">
      <span className={size === 'lg' ? 'text-[16px] font-semibold text-text' : 'text-[15px] font-semibold text-text-sub'}>
        {label}
        {required ? <span className="text-trust-low"> *</span> : null}
      </span>
      <div className="flex overflow-hidden rounded-full border border-border" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n, i) => {
          const selected = value === n;
          return (
            <label
              key={n}
              className={`flex flex-1 cursor-pointer items-center justify-center ${size === 'lg' ? 'py-3' : 'py-2.5'} text-[14px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface ${
                i > 0 ? 'border-l border-border' : ''
              } ${selected ? 'bg-primary-strong text-white' : 'bg-surface text-text-sub hover:bg-surface-strong'}`}
            >
              <input
                type="radio"
                name={name}
                value={n}
                required={required}
                checked={selected}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              {n}
            </label>
          );
        })}
      </div>
    </div>
  );
}

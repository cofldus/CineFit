// 1~5점 만족도 — 독립된 원형 버튼을 늘어놓는 대신, "매우 낮음 1 2 3 4 5 매우 높음" 하나의
// 세그먼트 스케일로 보여준다(브리프 명시 표기 그대로). 선택 시 살짝 커지는 전환 애니메이션과
// 네이티브 radio 기반 키보드 이동(화살표)·포커스 링을 그대로 유지한다.
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
  const chipSize = size === 'lg' ? 'h-11 w-11 text-[15px]' : 'h-9 w-9 text-[13.5px]';
  return (
    <div className="flex flex-col gap-2 py-3">
      <span className={size === 'lg' ? 'text-[15px] font-semibold text-text' : 'text-[13.5px] font-medium text-text-sub'}>
        {label}
        {required ? <span className="text-trust-low"> *</span> : null}
      </span>
      <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
        <span className="w-12 shrink-0 text-[11px] leading-tight text-text-tertiary sm:w-14">매우 낮음</span>
        <div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = value === n;
            return (
              <label
                key={n}
                className={`flex ${chipSize} cursor-pointer items-center justify-center rounded-full border-2 font-semibold transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface ${
                  selected
                    ? 'scale-110 border-primary-strong bg-primary-strong text-white'
                    : 'border-border text-text-sub hover:border-border-strong'
                }`}
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
        <span className="w-12 shrink-0 text-right text-[11px] leading-tight text-text-tertiary sm:w-14">매우 높음</span>
      </div>
    </div>
  );
}

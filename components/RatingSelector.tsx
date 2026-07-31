// 1~5점 만족도 한 줄 — 관람 피드백 폼에서 질문마다 별도 카드로 감싸던 것을 없애고, 라벨+칩
// 한 줄로 압축해 여러 문항이 있어도 "설문지"가 아니라 "선택 UI"처럼 보이게 한다.
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
  const chipSize = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-[13px]';
  return (
    <div className="flex flex-col gap-2 py-3">
      <span className={size === 'lg' ? 'text-[15px] font-semibold text-text' : 'text-[13.5px] font-medium text-text-sub'}>
        {label}
        {required ? <span className="text-trust-low"> *</span> : null}
      </span>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={`flex ${chipSize} cursor-pointer items-center justify-center rounded-full border border-border font-semibold text-text-sub transition-colors has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong has-[:checked]:text-white has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary-soft has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface`}
          >
            <input
              type="radio"
              name={name}
              value={n}
              required={required}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}

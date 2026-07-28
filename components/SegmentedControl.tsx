// 3개 안팎의 상호 배타적 선택지에 사용하는 세그먼트 컨트롤 — 네이티브 radio 그룹이라
// 폼 제출(FormData)·키보드 이동(화살표)·스크린리더 모두 별도 처리 없이 동작한다.
export function SegmentedControl({
  name,
  legend,
  options,
  defaultValue,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 block text-sm font-semibold text-text">{legend}</legend>
      <div role="radiogroup" className="grid grid-cols-1 gap-1.5 sm:grid-flow-col sm:auto-cols-fr">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong has-[:checked]:text-white has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface flex min-h-11 cursor-pointer items-center justify-center rounded-card border border-border bg-bg px-3 text-center text-sm font-medium text-text transition-colors"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={opt.value === defaultValue}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

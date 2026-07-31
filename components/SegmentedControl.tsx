// 3개 안팎의 상호 배타적 선택지에 사용하는 세그먼트 컨트롤 — 네이티브 radio 그룹이라
// 폼 제출(FormData)·키보드 이동(화살표)·스크린리더 모두 별도 처리 없이 동작한다.
// 시각은 "테두리 박스 나열"이 아니라 인셋 트랙(bg-surface-raised) 안에서 선택된 항목만
// 한 단계 떠오르며 얇은 와인 라인이 켜지는 방식 — 과한 채움 대신 미세한 내부 광원.
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
      <legend className="mb-2 block text-sm font-semibold text-text">{legend}</legend>
      <div role="radiogroup" className="flex flex-col gap-1 rounded-card bg-surface-raised p-1 sm:flex-row">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[10px] px-3 text-center text-sm font-medium text-text-sub transition-all has-[:checked]:bg-surface-strong has-[:checked]:font-semibold has-[:checked]:text-text has-[:checked]:shadow-[inset_0_0_0_1px_rgba(188,96,118,0.45),0_2px_10px_rgba(0,0,0,0.35)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface hover:text-text"
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

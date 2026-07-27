import { FORMAT_LABELS } from '../src/domain/recommendation/presets';

// 브랜드 로고 대신 텍스트 태그 (docs/09 §3 FormatTag — 저작권 독립)
export function FormatTag({ format }: { format: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-semibold text-accent">
      {FORMAT_LABELS[format] ?? format}
    </span>
  );
}

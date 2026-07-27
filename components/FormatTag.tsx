import { FORMAT_LABELS } from '../src/domain/recommendation/presets';

// 브랜드 로고 대신 텍스트 태그 (docs/09 §3 FormatTag — 저작권 독립)
export function FormatTag({ format }: { format: string }) {
  return <span className="badge badge-format">{FORMAT_LABELS[format] ?? format}</span>;
}

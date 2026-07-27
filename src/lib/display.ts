import type { MovieSpecKey, MovieWithSpecs, SpecValue } from '../domain/recommendation/types';

export const SPEC_KEY_LABELS: Record<MovieSpecKey, string> = {
  native_ar: '기본 화면비',
  imax_expanded_ar: 'IMAX 확장 화면비',
  filmed_for_imax: 'IMAX 인증 카메라',
  film_format: '촬영 포맷',
  atmos_mix: '돌비 애트모스 믹스',
  imax_sound_mix: 'IMAX 사운드 믹스',
  dolby_vision: '돌비 비전 마스터',
  dark_scene_ratio: '어두운 장면 비중',
  genre_spectacle: '시각 스펙터클 장르',
  format_versions: '배급 포맷 버전',
};

export function formatSpecValue(key: MovieSpecKey, spec: SpecValue): string {
  const v = spec.value;
  if (key === 'native_ar' || key === 'imax_expanded_ar') return `${v}:1`;
  if (key === 'dark_scene_ratio') return `${Math.round(Number(v) * 100)}%`;
  if (key === 'format_versions' && Array.isArray(v)) return v.join(' · ');
  if (typeof v === 'boolean') return v ? '있음' : '없음';
  return String(v);
}

// 영화 카드에 노출할 대표 사양 (있는 것만)
export function keySpecEntries(movie: MovieWithSpecs): { key: MovieSpecKey; spec: SpecValue }[] {
  const keys: MovieSpecKey[] = ['native_ar', 'imax_expanded_ar', 'film_format', 'atmos_mix', 'format_versions'];
  return keys.flatMap((key) => {
    const spec = movie.specs[key];
    return spec ? [{ key, spec }] : [];
  });
}

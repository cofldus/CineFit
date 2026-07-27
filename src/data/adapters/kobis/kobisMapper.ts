// KOBIS 응답 → 정규화 매핑.
// showTypes는 "KOBIS 등록 상영 형태" 사실만 남긴다 — 기술 사양(화면비·Atmos·Vision 등)을
// 여기서 생성·추론하지 않는다 (확대 해석 금지 원칙).
import type { BoxOfficeResponse, MovieInfoResponse } from './kobisSchemas.ts';
import type {
  KobisBoxOfficeEntry,
  KobisFormatEntry,
  KobisNormalizedFormat,
  NormalizedKobisMovie,
} from './kobisTypes.ts';

const FORMAT_GROUP_MAP: Record<string, KobisNormalizedFormat> = {
  IMAX: 'imax',
  DOLBYCINEMA: 'dolby_cinema',
  '4D': '4dx',
  SCREENX: 'screenx',
  '2D': 'standard',
  '3D': '3d',
};

export function normalizeShowTypes(
  showTypes: { showTypeGroupNm: string; showTypeNm: string }[],
): KobisFormatEntry[] {
  const seen = new Set<string>();
  const entries: KobisFormatEntry[] = [];
  for (const t of showTypes) {
    const raw = `${t.showTypeGroupNm}/${t.showTypeNm}`.trim();
    if (!raw || raw === '/' || seen.has(raw)) continue;
    seen.add(raw);
    const group = t.showTypeGroupNm.trim().toUpperCase().replace(/\s/g, '');
    entries.push({ raw, normalized: FORMAT_GROUP_MAP[group] ?? null });
  }
  return entries;
}

function toDate(yyyymmdd: string): string | null {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function mapMovieInfo(res: MovieInfoResponse): NormalizedKobisMovie {
  const m = res.movieInfoResult.movieInfo;
  return {
    kobisCode: m.movieCd,
    title: m.movieNm.trim(),
    titleEn: m.movieNmEn.trim() || null,
    runtimeMin: /^\d+$/.test(m.showTm) ? Number(m.showTm) : null,
    prodYear: /^\d{4}$/.test(m.prdtYear) ? Number(m.prdtYear) : null,
    openDate: toDate(m.openDt),
    genres: m.genres.map((g) => g.genreNm.trim()).filter(Boolean),
    directors: m.directors.map((d) => d.peopleNm.trim()).filter(Boolean),
    rating: m.audits[0]?.watchGradeNm?.trim() || null,
    formats: normalizeShowTypes(m.showTypes),
  };
}

export function mapBoxOffice(res: BoxOfficeResponse): KobisBoxOfficeEntry[] {
  return res.boxOfficeResult.dailyBoxOfficeList.map((e) => ({
    kobisCode: e.movieCd,
    title: e.movieNm.trim(),
    rank: /^\d+$/.test(e.rank) ? Number(e.rank) : null,
    openDate: toDate(e.openDt.replaceAll('-', '')),
  }));
}

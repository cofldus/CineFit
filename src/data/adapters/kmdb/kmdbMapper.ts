// KMDb 응답 → 정규화 매핑.
// 기술 필드(screenArea/soundEcho/fSound)는 원문 그대로만 옮긴다 — "1.85:1" 같은 값을
// native_ar 같은 우리 큐레이션 vocabulary로 해석·환산하지 않는다(kmdbSyncService.ts에서
// KMDb 전용 spec_key로 저장하는 이유 — 문서 KMDB-INTEGRATION.md).
import type { KmdbResultItem, KmdbSearchResponse } from './kmdbSchemas.ts';
import type { KmdbSearchCandidate, KmdbTechnicalField, NormalizedKmdbMovie } from './kmdbTypes.ts';

const stripHighlight = (s: string) => s.replaceAll('!HS', '').replaceAll('!HE', '').trim().replace(/\s+/g, ' ');

function toDate(repRlsDate: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(repRlsDate) ? repRlsDate : null;
}

// posters는 '|' 구분 URL 목록 — 첫 URL만 쓰고, http는 https로 승격한다(영상자료원 파일
// 서버가 https를 지원함을 실호출로 확인). http/https가 아닌 값은 버린다.
function posterUrlOf(item: KmdbResultItem): string | null {
  const first = item.posters.split('|')[0]?.trim();
  if (!first || !/^https?:\/\//.test(first)) return null;
  return first.replace(/^http:\/\//, 'https://');
}

function technicalFieldsOf(item: KmdbResultItem): KmdbTechnicalField[] {
  const fields: KmdbTechnicalField[] = [];
  if (item.screenArea.trim()) fields.push({ key: 'screen_area', rawValue: item.screenArea.trim() });
  if (item.soundEcho.trim()) fields.push({ key: 'sound_echo', rawValue: item.soundEcho.trim() });
  if (item.fSound.trim()) fields.push({ key: 'f_sound', rawValue: item.fSound.trim() });
  return fields;
}

export function mapSearchResult(item: KmdbResultItem): NormalizedKmdbMovie {
  return {
    docId: item.DOCID,
    title: stripHighlight(item.title),
    titleEng: item.titleEng.trim() ? stripHighlight(item.titleEng) : null,
    prodYear: /^\d{4}$/.test(item.prodYear) ? Number(item.prodYear) : null,
    runtimeMin: /^\d+$/.test(item.runtime) ? Number(item.runtime) : null,
    repRlsDate: toDate(item.repRlsDate),
    directors: item.directors.director.map((d) => stripHighlight(d.directorNm)).filter(Boolean),
    rating: item.rating.trim() || null,
    plotSummary: item.plots.plot[0]?.plotText?.trim() || null,
    posterUrl: posterUrlOf(item),
    technicalFields: technicalFieldsOf(item),
  };
}

export function mapSearchCandidates(res: KmdbSearchResponse): KmdbSearchCandidate[] {
  const items = res.Data[0]?.Result ?? [];
  return items.map((item) => ({
    docId: item.DOCID,
    title: stripHighlight(item.title),
    titleEng: item.titleEng.trim() ? stripHighlight(item.titleEng) : null,
    prodYear: /^\d{4}$/.test(item.prodYear) ? Number(item.prodYear) : null,
    directors: item.directors.director.map((d) => stripHighlight(d.directorNm)).filter(Boolean),
  }));
}

export function findResultByDocId(res: KmdbSearchResponse, docId: string): KmdbResultItem | null {
  return res.Data[0]?.Result?.find((item) => item.DOCID === docId) ?? null;
}

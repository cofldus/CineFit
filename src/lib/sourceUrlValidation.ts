// R21.1 §2 — 회차 source/booking URL 서버측 검증. CSV preview·commit·수동 폼이 전부
// 이 함수 하나를 쓴다(검증 분기 이원화 금지).
//
// 원칙:
// - 빈 값·http(s) 외 프로토콜·localhost/loopback/사설 호스트 거부
// - example.invalid 등 placeholder/예약 도메인은 "템플릿 미교체" 오류로 명확히 표시
// - 알파 실회차(비합성)는 극장사 공식 도메인(allowlist)만 허용

/** 알파 기간 공식 도메인 allowlist — 서브도메인 포함(ticket.cgv.co.kr 등). */
export const OFFICIAL_SOURCE_DOMAINS = ['cgv.co.kr', 'lottecinema.co.kr', 'megabox.co.kr'] as const;

// RFC 예약(2606)·placeholder 신호 — 템플릿을 교체하지 않고 올린 행을 잡는다.
const PLACEHOLDER_TLDS = ['.invalid', '.test', '.example', '.localhost'];
const PLACEHOLDER_HOSTS = new Set(['example.com', 'example.org', 'example.net']);
const PLACEHOLDER_MARKERS = ['replace', 'placeholder', '교체'];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export type SourceUrlCheck = { ok: true; host: string } | { ok: false; error: string };

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function validateSourceUrl(
  raw: string | null | undefined,
  opts: { requireOfficial?: boolean; fieldLabel?: string } = {},
): SourceUrlCheck {
  const label = opts.fieldLabel ?? 'URL';
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, error: `${label}이(가) 비어 있습니다.` };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: `${label}이(가) 유효한 URL이 아닙니다.` };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: `${label}은(는) http(s)만 허용됩니다 (${url.protocol}).` };
  }

  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return { ok: false, error: `${label}에 로컬/사설 호스트(${host})는 사용할 수 없습니다.` };
  }
  const lower = value.toLowerCase();
  if (
    PLACEHOLDER_TLDS.some((t) => host.endsWith(t)) ||
    PLACEHOLDER_HOSTS.has(host) ||
    PLACEHOLDER_MARKERS.some((m) => lower.includes(m))
  ) {
    return {
      ok: false,
      error: `${label}이(가) 템플릿 placeholder(${host})입니다 — 실제 확인한 공식 페이지 URL로 교체하세요.`,
    };
  }

  if (opts.requireOfficial && !OFFICIAL_SOURCE_DOMAINS.some((d) => hostMatches(host, d))) {
    return {
      ok: false,
      error: `${label}은(는) 극장사 공식 도메인만 허용됩니다 (${OFFICIAL_SOURCE_DOMAINS.join(', ')}) — 입력: ${host}`,
    };
  }

  return { ok: true, host };
}

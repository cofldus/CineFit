// KOBIS HTTP 클라이언트 — 타임아웃·재시도·호출 간격 제한. fetch 주입으로 테스트 가능.
// 키·전체 응답 원문은 로그에 출력하지 않는다.
import { boxOfficeResponseSchema, kobisFaultSchema, movieInfoResponseSchema } from './kobisSchemas.ts';
import type { BoxOfficeResponse, MovieInfoResponse } from './kobisSchemas.ts';

const BASE = 'https://www.kobis.or.kr/kobisopenapi/webservice/rest';
const UA = 'CineFit/0.2 (registered KOBIS open API user)';

export class KobisError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'http' | 'fault' | 'timeout' | 'parse' | 'network',
  ) {
    super(message);
    this.name = 'KobisError';
  }
}

export interface KobisClientOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  retries?: number; // 5xx·네트워크 오류에만 재시도
  minIntervalMs?: number; // 저빈도 호출 원칙 (docs/07)
}

export class KobisClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly minIntervalMs: number;
  private lastCallAt = 0;

  constructor(opts: KobisClientOptions) {
    if (!opts.apiKey) throw new KobisError('KOBIS_API_KEY가 설정되지 않았습니다.', 'auth');
    this.apiKey = opts.apiKey;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.retries = opts.retries ?? 2;
    this.minIntervalMs = opts.minIntervalMs ?? 300;
  }

  private async throttle(): Promise<void> {
    const wait = this.lastCallAt + this.minIntervalMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }

  private async request(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${BASE}/${path}`);
    url.searchParams.set('key', this.apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let lastError: KobisError | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this.throttle();
      try {
        const res = await this.fetchFn(url, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (res.status >= 500) {
          lastError = new KobisError(`KOBIS 서버 오류 (HTTP ${res.status})`, 'http');
          continue; // 재시도
        }
        if (!res.ok) throw new KobisError(`KOBIS 요청 실패 (HTTP ${res.status})`, 'http');

        let json: unknown;
        try {
          json = await res.json();
        } catch {
          throw new KobisError('KOBIS 응답이 JSON이 아닙니다.', 'parse');
        }
        const fault = kobisFaultSchema.safeParse(json);
        if (fault.success && fault.data.faultInfo) {
          throw new KobisError(`KOBIS API 오류: ${fault.data.faultInfo.message}`, 'fault');
        }
        return json;
      } catch (e) {
        if (e instanceof KobisError) {
          if (e.kind === 'http' && lastError === e) continue;
          if (e.kind === 'fault' || e.kind === 'parse' || e.kind === 'http') throw e;
        }
        if (e instanceof Error && e.name === 'TimeoutError') {
          lastError = new KobisError(`KOBIS 응답 시간 초과 (${this.timeoutMs}ms)`, 'timeout');
          continue;
        }
        lastError = new KobisError('KOBIS 네트워크 오류', 'network');
      }
      if (attempt < this.retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    throw lastError ?? new KobisError('KOBIS 요청 실패', 'network');
  }

  async dailyBoxOffice(targetDt: string): Promise<BoxOfficeResponse> {
    const json = await this.request('boxoffice/searchDailyBoxOfficeList.json', { targetDt });
    const parsed = boxOfficeResponseSchema.safeParse(json);
    if (!parsed.success) throw new KobisError('박스오피스 응답 형식이 예상과 다릅니다.', 'parse');
    return parsed.data;
  }

  async movieInfo(movieCd: string): Promise<MovieInfoResponse> {
    const json = await this.request('movie/searchMovieInfo.json', { movieCd });
    const parsed = movieInfoResponseSchema.safeParse(json);
    if (!parsed.success) throw new KobisError('영화 상세 응답 형식이 예상과 다릅니다.', 'parse');
    return parsed.data;
  }
}

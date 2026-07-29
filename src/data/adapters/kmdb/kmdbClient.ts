// KMDb(한국영상자료원) HTTP 클라이언트 — 타임아웃·재시도·호출 간격 제한. fetch 주입으로 테스트 가능.
// kobisClient.ts와 동일한 구조 — 키·전체 응답 원문은 로그에 출력하지 않는다.
import { kmdbSearchResponseSchema } from './kmdbSchemas.ts';
import type { KmdbSearchResponse } from './kmdbSchemas.ts';

const BASE = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp';
const UA = 'CineFit/0.2 (registered KMDb open API user)';

export type KmdbErrorKind = 'auth' | 'http' | 'timeout' | 'parse' | 'network';

export class KmdbError extends Error {
  readonly kind: KmdbErrorKind;

  constructor(message: string, kind: KmdbErrorKind) {
    super(message);
    this.name = 'KmdbError';
    this.kind = kind;
  }
}

export interface KmdbClientOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  minIntervalMs?: number; // 저빈도 호출 원칙 (docs/07)
}

export interface KmdbSearchOptions {
  director?: string;
  listCount?: number;
}

export class KmdbClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly minIntervalMs: number;
  private lastCallAt = 0;

  constructor(opts: KmdbClientOptions) {
    if (!opts.apiKey) throw new KmdbError('KMDB_API_KEY가 설정되지 않았습니다.', 'auth');
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

  async searchByTitle(title: string, opts: KmdbSearchOptions = {}): Promise<KmdbSearchResponse> {
    const url = new URL(BASE);
    url.searchParams.set('collection', 'kmdb_new2');
    url.searchParams.set('detail', 'Y');
    url.searchParams.set('ServiceKey', this.apiKey);
    url.searchParams.set('title', title);
    if (opts.director) url.searchParams.set('director', opts.director);
    url.searchParams.set('listCount', String(opts.listCount ?? 10));

    let lastError: KmdbError | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this.throttle();
      try {
        const res = await this.fetchFn(url, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (res.status >= 500) {
          lastError = new KmdbError(`KMDb 서버 오류 (HTTP ${res.status})`, 'http');
          if (attempt < this.retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        if (!res.ok) throw new KmdbError(`KMDb 요청 실패 (HTTP ${res.status})`, 'http');

        let json: unknown;
        try {
          json = await res.json();
        } catch {
          throw new KmdbError('KMDb 응답이 JSON이 아닙니다.', 'parse');
        }
        const parsed = kmdbSearchResponseSchema.safeParse(json);
        if (!parsed.success) throw new KmdbError('KMDb 검색 응답 형식이 예상과 다릅니다.', 'parse');
        return parsed.data;
      } catch (e) {
        if (e instanceof KmdbError && (e.kind === 'parse' || e.kind === 'http')) throw e;
        lastError =
          e instanceof Error && e.name === 'TimeoutError'
            ? new KmdbError(`KMDb 응답 시간 초과 (${this.timeoutMs}ms)`, 'timeout')
            : new KmdbError('KMDb 네트워크 오류', 'network');
      }
      if (attempt < this.retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    throw lastError ?? new KmdbError('KMDb 요청 실패', 'network');
  }
}

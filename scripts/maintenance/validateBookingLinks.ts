// 예매 링크 검증 — 활성·비합성 회차의 공식 예매 URL에 HEAD 요청만 보내 상태 코드·리다이렉트
// 여부만 확인한다. 좌석 가용성 등 페이지 본문은 절대 읽지 않고, 로그인·CAPTCHA 우회를 시도하지
// 않으며, 요청 사이에 지연을 두어 과도한 트래픽을 피한다.
// 사용: npm run maintenance:links
import { fileURLToPath } from 'node:url';
import { bookingLinkRepository } from '../../src/data/bookingLinkRepository';
import { classifyBookingLinkCheck, type BookingLinkStatus } from '../../src/domain/bookingLink/checker';
import { getAppClock } from '../../src/lib/clock';

const REQUEST_TIMEOUT_MS = 8_000;
const DELAY_BETWEEN_REQUESTS_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RawCheckResult {
  fetchError: boolean;
  httpStatus: number | null;
  redirected: boolean;
  finalUrl: string | null;
}

async function checkOne(url: string): Promise<RawCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    return { fetchError: false, httpStatus: res.status, redirected: res.redirected, finalUrl: res.url };
  } catch {
    return { fetchError: true, httpStatus: null, redirected: false, finalUrl: null };
  } finally {
    clearTimeout(timer);
  }
}

export interface ValidateBookingLinksResult {
  totalChecked: number;
  summary: Partial<Record<BookingLinkStatus, number>>;
}

export async function validateBookingLinks(now: Date = getAppClock().now()): Promise<ValidateBookingLinksResult> {
  const targets = await bookingLinkRepository.listCheckableShowtimes();
  const summary: Partial<Record<BookingLinkStatus, number>> = {};
  for (const target of targets) {
    const raw = await checkOne(target.bookingUrl);
    const status = classifyBookingLinkCheck({
      requestedUrl: target.bookingUrl,
      chain: target.chain,
      showtimeStartsAt: target.startsAt,
      now,
      ...raw,
    });
    summary[status] = (summary[status] ?? 0) + 1;
    await bookingLinkRepository.recordCheck({
      showtimeId: target.showtimeId,
      status,
      httpStatus: raw.httpStatus,
      note: raw.fetchError ? '요청 실패(타임아웃 또는 네트워크 오류)' : null,
      checkedAt: now.toISOString(),
    });
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
  return { totalChecked: targets.length, summary };
}

async function main(): Promise<void> {
  const result = await validateBookingLinks();
  console.log(`예매 링크 검증 완료: 총 ${result.totalChecked}건`);
  for (const [status, count] of Object.entries(result.summary)) console.log(`  ${status}: ${count}건`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

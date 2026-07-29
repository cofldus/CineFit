// 구조화 로깅 — 한 줄 JSON으로 남겨 배포 환경(Vercel 등)의 로그 수집기가 event·필드로
// 검색·집계할 수 있게 한다. 문자열을 이어붙인 console.log/error 대신 API 라우트의 에러
// 처리와 프로세스 생명주기 이벤트에 이걸 쓴다. CLI 스크립트의 사람이 읽는 터미널 출력은
// 대상이 아니다(scripts/*.ts는 지금처럼 console.log 그대로 사용).
type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

function serializeError(err: unknown): LogFields {
  if (err instanceof Error) {
    return { errorName: err.name, errorMessage: err.message, stack: err.stack };
  }
  return { errorValue: typeof err === 'string' ? err : String(err) };
}

function write(level: LogLevel, event: string, fields: LogFields): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info(event: string, fields: LogFields = {}): void {
    write('info', event, fields);
  },
  warn(event: string, fields: LogFields = {}): void {
    write('warn', event, fields);
  },
  /** err는 요청 본문·이메일 등 개인정보를 담고 있지 않아야 한다 — 호출부에서 직접 걸러낸다. */
  error(event: string, err: unknown, fields: LogFields = {}): void {
    write('error', event, { ...serializeError(err), ...fields });
  },
};

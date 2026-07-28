// 개발용 PostgreSQL 초기화 — 볼륨 삭제 후 재기동. 운영 환경에서는 실행 거부.
import { execSync } from 'node:child_process';

if (process.env.CINEFIT_ENV === 'production' || process.env.VERCEL || process.env.CI) {
  console.error('pg:reset 은 로컬 개발 환경 전용입니다 — 운영·CI에서 실행할 수 없습니다.');
  process.exit(1);
}

execSync('docker compose down -v', { stdio: 'inherit' });
execSync('docker compose up -d --wait postgres', { stdio: 'inherit' });
console.log('PostgreSQL 볼륨 초기화 완료 — npm run db:migrate 를 다시 실행하세요.');

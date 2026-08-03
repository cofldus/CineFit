import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // node:sqlite(내장 모듈) 사용 — 서버 코드에서만 임포트되므로 추가 설정 불필요
  images: {
    // 영화 포스터 — KMDb 공식 오픈API가 주는 영상자료원 파일 서버만 허용.
    remotePatterns: [{ protocol: 'https', hostname: 'file.koreafilm.or.kr' }],
  },
};

export default nextConfig;

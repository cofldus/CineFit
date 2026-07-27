import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CineFit — 시네핏',
    short_name: 'CineFit',
    lang: 'ko',
    description: '영화에 딱 맞는 상영관을 찾아주는 맞춤형 영화 관람 추천 서비스',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E1116',
    theme_color: '#0E1116',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}

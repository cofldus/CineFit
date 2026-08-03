import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RecommendForm } from '../../../components/RecommendForm';
import { DEMO_DATE } from '../../../src/data/constants';
import { getAppClock, seoulDateString } from '../../../src/lib/clock';
import { movieRepository } from '../../../src/data/movieRepository';
import { showtimeRepository } from '../../../src/data/showtimeRepository';

export const metadata: Metadata = { title: '추천 조건 입력' };
export const dynamic = 'force-dynamic';

export default async function RecommendPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  const id = Number(movieId);
  const movie = Number.isInteger(id) ? await movieRepository.findById(id) : null;
  if (!movie) notFound();

  // 기본 관람 날짜: 오늘(Asia/Seoul) 이후 활성 회차가 있는 가장 가까운 날짜, 없으면 데모 날짜
  const today = seoulDateString(getAppClock().now());
  const dates = await showtimeRepository.listActiveDates(movie.id);
  const defaultDate = dates.find((d) => d >= today) ?? dates.at(-1) ?? DEMO_DATE;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6 lg:max-w-4xl">
      <h1 className="type-display m-0 text-[28px] text-text sm:text-[32px]">어떤 조건을 원하세요?</h1>
      <p className="m-0 mt-1.5 text-[15px] text-text-sub">아래 조건에 맞는 상영관을 찾아드릴게요.</p>

      {/* 영화 요약·조건 요약·실시간 후보 수는 폼(RecommendForm) 내부 레이아웃이 담당한다 —
          데스크톱은 우측 sticky 패널, 모바일은 폼 상단 compact 카드. */}
      <div className="mt-6">
        <RecommendForm movieId={movie.id} defaultDate={defaultDate} movie={movie} />
      </div>
    </main>
  );
}

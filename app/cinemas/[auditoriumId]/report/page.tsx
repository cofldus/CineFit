import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Notice } from '../../../../components/Notice';
import { ReportForm } from '../../../../components/ReportForm';
import { cinemaRepository } from '../../../../src/data/cinemaRepository';
import { getAppClock, seoulDateString, seoulTimeString } from '../../../../src/lib/clock';

export const metadata: Metadata = { title: '정보 수정 제보' };
export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ auditoriumId: string }> }) {
  const id = Number((await params).auditoriumId);
  const detail = Number.isInteger(id)
    ? await cinemaRepository.getAuditoriumDetail(id, getAppClock().now().toISOString())
    : null;
  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <p className="m-0 text-sm text-text-sub">
        <Link className="text-text hover:underline decoration-border-strong underline-offset-2" href={`/cinemas/${detail.id}`}>
          ← {detail.location.name} {detail.no}
        </Link>
      </p>
      <h1 className="m-0 mt-2 text-[28px] font-bold text-text sm:text-[32px]">정보 수정 제보</h1>
      <div className="mt-3">
        <Notice>
          제출한 내용은 <strong className="font-semibold">즉시 공식 정보로 바뀌지 않아요.</strong>{' '}
          관리자가 근거를 검토한 뒤에 반영 여부를 결정해요. 이름·전화번호 같은 개인정보는 적지
          마시고, 공식 출처가 있으면 URL을 첨부해 주세요.
        </Notice>
      </div>
      <div className="mt-5">
        <ReportForm
          auditoriumId={detail.id}
          showtimes={detail.upcomingShowtimes.map((s) => ({
            id: s.id,
            label: `${seoulDateString(new Date(s.startsAt))} ${seoulTimeString(new Date(s.startsAt))} ${s.movieTitle}`,
          }))}
        />
      </div>
    </main>
  );
}

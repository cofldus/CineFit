import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlphaConsentForm } from '../../../components/AlphaConsentForm';

export const metadata: Metadata = { title: '알파 참여 안내' };
export const dynamic = 'force-dynamic';

const POINTS = [
  '지금 보시는 CineFit은 테스트 중인 서비스예요 — 정식 서비스가 아니에요.',
  '상영 정보(회차·가격 등)가 아직 불완전할 수 있어요.',
  '예매 전에는 반드시 각 극장 공식 예매 페이지에서 다시 확인해 주세요.',
  '사용 흐름과 추천에 대한 피드백은 서비스 개선에 사용돼요.',
  '정확한 위치(GPS)나 전체 IP 주소는 저장하지 않아요(docs/PRIVACY-BETA.md).',
  '언제든 참여를 중단할 수 있어요.',
  '남기신 피드백의 삭제를 요청할 수 있어요.',
];

export default function AlphaConsentPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">알파 참여 전에 알아두세요</h1>
      <ul className="mt-4 flex list-none flex-col gap-2 p-0">
        {POINTS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-text-sub">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {p}
          </li>
        ))}
      </ul>
      <Suspense>
        <AlphaConsentForm />
      </Suspense>
    </main>
  );
}

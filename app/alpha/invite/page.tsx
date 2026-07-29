import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AlphaInviteForm } from '../../../components/AlphaInviteForm';

export const metadata: Metadata = { title: '초대 코드' };
export const dynamic = 'force-dynamic';

export default function AlphaInvitePage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">비공개 알파 초대</h1>
      <p className="mt-2 text-sm text-text-sub">
        지금 CineFit은 초대받은 분들과 함께하는 비공개 테스트 기간이에요. 받으신 초대 코드를
        입력해 주세요.
      </p>
      <Suspense>
        <AlphaInviteForm />
      </Suspense>
    </main>
  );
}

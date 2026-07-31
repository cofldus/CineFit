import type { Metadata } from 'next';
import { EmailDeletionForm, SessionDeletionForm } from '../../components/PrivacyRequestForms';

export const metadata: Metadata = { title: '개인정보 삭제 요청' };
export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="m-0 text-[28px] font-bold text-text sm:text-[32px]">개인정보 삭제 요청</h1>
      <p className="m-0 mt-2.5 leading-relaxed text-text-sub">
        CineFit이 실제로 수집·저장하는 것과 그렇지 않은 것은 docs/PRIVACY-BETA.md에 그대로
        적혀 있어요. 아래 두 가지 요청을 보낼 수 있어요 — 어느 쪽이든 관리자가 확인한 뒤
        처리돼요(즉시 자동 삭제되지 않아요).
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <SessionDeletionForm />
        <EmailDeletionForm />
      </div>
    </main>
  );
}

import { NextResponse } from 'next/server';
import { privacyRequestService, type PrivacyRequestStatus } from '../../../../src/data/privacyRequestService';
import { isAdminRequest } from '../../../../src/lib/adminAuth';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
const STATUSES: PrivacyRequestStatus[] = ['pending', 'completed', 'rejected'];

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const status = new URL(req.url).searchParams.get('status');
  const filter = status && STATUSES.includes(status as PrivacyRequestStatus) ? { status: status as PrivacyRequestStatus } : undefined;
  return NextResponse.json({ requests: await privacyRequestService.list(filter) });
}

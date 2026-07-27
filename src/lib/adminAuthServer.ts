import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from './adminAuth';

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

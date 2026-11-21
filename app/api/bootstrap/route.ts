import { connection } from 'next/server';
import { errorResponse, getAccount, getLists, getRecent, isConfigured, uploadsEnabled } from '@/lib/gepetto';

/** Everything the page needs to start: the lists of ids, the account, the latest renders. */
export async function GET() {
  await connection(); // at request time, never at build time
  if (!isConfigured()) return Response.json({ configured: false });
  try {
    const [lists, account, recent] = await Promise.all([getLists(), getAccount(), getRecent()]);
    return Response.json({ configured: true, uploads: uploadsEnabled(), lists, account, recent });
  } catch (e) {
    return errorResponse(e);
  }
}

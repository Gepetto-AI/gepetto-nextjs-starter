import { connection } from 'next/server';
import { errorResponse, getAccount, getRecent } from '@/lib/gepetto';

/** The latest renders and the account, refreshed after each render. */
export async function GET() {
  await connection();
  try {
    const [account, recent] = await Promise.all([getAccount(), getRecent()]);
    return Response.json({ account, recent });
  } catch (e) {
    return errorResponse(e);
  }
}

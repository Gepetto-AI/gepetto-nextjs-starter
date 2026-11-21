// Server side only: the Gepetto client, the lists of ids, the account. The API key never reaches the browser.
import { cacheLife } from 'next/cache';
import { Gepetto, GepettoError } from '@gepetto/sdk';

let client: Gepetto | null = null;

/** The client, created once. Reads GEPETTO_API_KEY (`npx @gepetto/cli init` writes it to .env). */
export function gepetto(): Gepetto {
  if (!client) client = new Gepetto();
  return client;
}

export function isConfigured(): boolean {
  return !!process.env.GEPETTO_API_KEY?.trim();
}

/** Uploads are on when the developer has connected a Vercel Blob store (see README, "Your own photos"). */
export function uploadsEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export interface Lists {
  autoRooms: Option[];
  zoneRooms: Option[];
  allRooms: Option[];
  styles: Option[];
  furniture: Option[];
  skies: Option[];
  walls: Option[];
  floors: Option[];
}

export interface Option {
  id: string;
  name: string;
}

/** The valid ids of the tools, from the API (they change rarely: cached for an hour). */
export async function getLists(): Promise<Lists> {
  'use cache';
  cacheLife('hours');
  const g = gepetto();
  const [rooms, styles, furniture, skies, surfaces] = await Promise.all([
    g.listRooms(), g.listStyles(), g.listFurnitures(), g.listSkies(), g.listSurfaces(),
  ]);
  const option = (item: { id: string; name: string; name_en?: string }) => ({ id: item.id, name: item.name_en || item.name });
  return {
    autoRooms: rooms.filter((r) => r.modes.includes('auto')).map(option),
    zoneRooms: rooms.filter((r) => r.modes.includes('zone')).map(option),
    allRooms: rooms.map(option),
    // Styles have one name, in French, in the API
    styles: styles.map((s) => ({ id: s.id, name: s.name })),
    furniture: Object.values(furniture).flat().map(option),
    skies: skies.map(option),
    walls: surfaces.walls.map(option),
    floors: surfaces.floors.map(option),
  };
}

export interface AccountSummary {
  keyType: 'test' | 'live';
  /** Test key: renders left out of 200. */
  testRendersLeft: number | null;
}

export async function getAccount(): Promise<AccountSummary> {
  const account = await gepetto().account();
  return {
    keyType: account.key_type,
    testRendersLeft: account.test_renders ? account.test_renders.limit - account.test_renders.used : null,
  };
}

export interface RecentJob {
  id: string;
  tool: string;
  output: string;
}

/** The latest successful renders of the key, newest first. */
export async function getRecent(): Promise<RecentJob[]> {
  const jobs = await gepetto().listJobs({ status: 'success', limit: 12 });
  return jobs.filter((j) => j.output).map((j) => ({ id: j.id, tool: j.tool, output: j.output as string }));
}

/** A GepettoError as JSON for the page: the code for the code, the message for the person. */
export function errorResponse(e: unknown): Response {
  if (e instanceof GepettoError) {
    const message = e.code === 'timeout'
      ? 'Still rendering after nearly 5 minutes. The render goes on: it will appear in Recent when it is done.'
      : e.message;
    return Response.json({ error: { code: e.code, message, param: e.param ?? null, jobId: e.jobId ?? null } }, { status: e.status ?? 504 });
  }
  console.error(e);
  return Response.json({ error: { code: 'internal_error', message: 'Something went wrong on the server. Check its logs.', param: null, jobId: null } }, { status: 500 });
}

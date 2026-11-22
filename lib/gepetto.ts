// Server side only: the Gepetto client, the lists of ids, the account, the latest renders.
// The API key is read here, on the server, and never reaches the browser.
import { cacheLife } from "next/cache";
import { Gepetto, GepettoError } from "@gepetto/sdk";

let client: Gepetto | null = null;

/** The client, created on first use. It reads GEPETTO_API_KEY (`npx @gepetto/cli init` writes it to .env). */
export function gepetto(): Gepetto {
  if (!client) client = new Gepetto();
  return client;
}

/** Is there an API key? Without one, the page shows how to get a free test key. */
export function isConfigured(): boolean {
  return Boolean(process.env.GEPETTO_API_KEY?.trim());
}

/** Uploads are on when a Vercel Blob store is connected (see README, "Your own photos"). */
export function uploadsEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** One choice of a list: its id for the API, its name for people. */
export interface Option {
  id: string;
  name: string;
}

/** The choices of each list of the panel, from the API. */
export interface Lists {
  /** Rooms that can be furnished whole. */
  autoRooms: Option[];
  /** Rooms that can fill a painted zone. */
  zoneRooms: Option[];
  /** All the rooms (Restyle). */
  allRooms: Option[];
  styles: Option[];
  furniture: Option[];
  skies: Option[];
  walls: Option[];
  floors: Option[];
  finishes: Option[];
}

/** The valid ids of each list, from the API. They rarely change: cached for an hour. */
export async function getLists(): Promise<Lists> {
  "use cache";
  cacheLife("hours");

  const [rooms, styles, furniture, skies, surfaces] = await Promise.all([
    gepetto().listRooms(),
    gepetto().listStyles(),
    gepetto().listFurnitures(),
    gepetto().listSkies(),
    gepetto().listSurfaces(),
  ]);

  // The English name when there is one (styles have one name, in French), without the emojis of some names
  const toOption = (item: { id: string; name: string; name_en?: string }) => ({
    id: item.id,
    name: (item.name_en || item.name).replace(/\s*\(?\p{Extended_Pictographic}+\)?/gu, "").trim(),
  });

  return {
    autoRooms: rooms.filter((room) => room.modes.includes("auto")).map(toOption),
    zoneRooms: rooms.filter((room) => room.modes.includes("zone")).map(toOption),
    allRooms: rooms.map(toOption),
    styles: styles.map(toOption),
    // The furniture comes grouped by category: one list is enough here
    furniture: Object.values(furniture).flat().map(toOption),
    skies: skies.map(toOption),
    walls: surfaces.walls.map(toOption),
    floors: surfaces.floors.map(toOption),
    finishes: surfaces.finishes.map(toOption),
  };
}

export interface AccountSummary {
  keyType: "test" | "live";
  /** With a test key: renders left out of 200. */
  testRendersLeft: number | null;
}

export async function getAccount(): Promise<AccountSummary> {
  const account = await gepetto().account();
  const testRenders = account.test_renders;
  return {
    keyType: account.key_type,
    testRendersLeft: testRenders ? testRenders.limit - testRenders.used : null,
  };
}

export interface RecentJob {
  id: string;
  /** The API's name of the tool: "furnish", "surfaces"... */
  tool: string;
  output: string;
}

/** The latest successful renders made with this key, newest first. */
export async function getRecent(): Promise<RecentJob[]> {
  const jobs = await gepetto().listJobs({ status: "success", limit: 12 });
  const recent: RecentJob[] = [];
  for (const job of jobs) {
    if (job.output) recent.push({ id: job.id, tool: job.tool, output: job.output });
  }
  return recent;
}

/** An error as JSON for the page: the code for the code, the message for the person. */
export function errorResponse(error: unknown): Response {
  if (error instanceof GepettoError) {
    const message =
      error.code === "timeout"
        ? "Still rendering after nearly 5 minutes. The render goes on: it will appear in Recent when it is done."
        : error.message;
    return Response.json(
      { error: { code: error.code, message, param: error.param ?? null } },
      { status: error.status ?? 504 },
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "internal_error", message: "Something went wrong on the server. Check its logs." } },
    { status: 500 },
  );
}

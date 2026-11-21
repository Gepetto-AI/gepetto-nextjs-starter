// Browser side: the page's calls to this app's own routes (app/api). The page never calls Gepetto itself,
// so the API key stays on the server.
import type { AccountSummary, Lists, RecentJob } from "./gepetto";
import type { SdkCall } from "./sdk-calls";

/** An error to show: `message` for people, `code` for the code (the API's error codes). */
export interface ApiError {
  code: string;
  message: string;
  /** The field the error is about, such as "url". */
  param?: string | null;
}

export type StudioData =
  | { status: "ready"; uploads: boolean; lists: Lists; account: AccountSummary; recent: RecentJob[] }
  | { status: "no_key" }
  | { status: "error"; error: ApiError };

/** Everything the page needs to start: the lists of ids, the account, the latest renders. */
export async function loadStudio(): Promise<StudioData> {
  try {
    const response = await fetch("/api/bootstrap");
    const data = await response.json();
    if (!response.ok) return { status: "error", error: data.error };
    if (!data.configured) return { status: "no_key" };
    return { status: "ready", uploads: data.uploads, lists: data.lists, account: data.account, recent: data.recent };
  } catch {
    return { status: "error", error: CONNECTION_ERROR };
  }
}

/** The account and the latest renders, to refresh after a render. */
export async function loadRecent(): Promise<{ account: AccountSummary; recent: RecentJob[] } | null> {
  const response = await fetch("/api/recent");
  if (!response.ok) return null;
  return response.json();
}

export type RenderResult =
  | { ok: true; output: string; jobId: string }
  | { ok: false; error: ApiError };

/** Makes one image: the server makes the SDK call and answers when the image is ready. */
export async function renderImage(call: SdkCall, idempotencyKey: string): Promise<RenderResult> {
  try {
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call, idempotencyKey }),
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error };
    return { ok: true, output: data.job.output, jobId: data.job.id };
  } catch {
    return { ok: false, error: CONNECTION_ERROR };
  }
}

/** Sends a photo to your Vercel Blob store (see app/api/upload/route.ts) and gives back its public URL. */
export async function uploadPhoto(file: File, onProgress: (percent: number) => void): Promise<string> {
  const { upload } = await import("@vercel/blob/client");
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    onUploadProgress: (event) => onProgress(Math.round(event.percentage)),
  });
  return blob.url;
}

const CONNECTION_ERROR: ApiError = {
  code: "connection_error",
  message: "Could not reach the server. Is it still running?",
};

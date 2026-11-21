// Server side only: makes the SDK call that the page sent (see lib/sdk-calls.ts).
// Each method waits for the image and resolves with the finished job (job.output is the URL of the image),
// or throws a GepettoError (turned into JSON for the page by errorResponse, in lib/gepetto.ts).
import { gepetto } from "./gepetto";
import type { SdkCall } from "./sdk-calls";

// Vercel stops a function after 300 s (see app/api/render/route.ts): stop waiting a little before.
const TIMEOUT_MS = 285_000;

export async function render(call: SdkCall, idempotencyKey: string) {
  const options = { idempotencyKey, timeout: TIMEOUT_MS };

  switch (call.method) {
    case "enhance":
      return gepetto().enhance(call.params, options);
    case "declutter":
      return gepetto().declutter(call.params, options);
    case "furnish":
      return gepetto().furnish(call.params, options);
    case "sunshine":
      return gepetto().sunshine(call.params, options);
    case "creativeRedesign":
      return gepetto().creativeRedesign(call.params, options);
    case "surfaces":
      return gepetto().surfaces(call.params, options);
    case "upscale":
      return gepetto().upscale(call.params, options);
  }
}

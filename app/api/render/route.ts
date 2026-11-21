import { errorResponse, isConfigured } from "@/lib/gepetto";
import { render } from "@/lib/render";
import type { SdkCall } from "@/lib/sdk-calls";

// A render takes 15 to 90 seconds, sometimes more: the request waits for the image.
// 300 s is the most a Vercel Hobby function can last (800 s on Pro).
export const maxDuration = 300;

interface RenderBody {
  /** The SDK call to make (lib/sdk-calls.ts). */
  call: SdkCall;
  /** One per click: a retry of the same click never renders, nor bills, twice. */
  idempotencyKey: string;
}

const METHODS = ["enhance", "declutter", "furnish", "sunshine", "creativeRedesign", "surfaces", "upscale"];

/** Makes one image, and answers when it is ready. */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json(
      { error: { code: "missing_api_key", message: "Set GEPETTO_API_KEY (npx @gepetto/cli init), then restart." } },
      { status: 500 },
    );
  }

  // This example makes the call that the page sends. In your product, build the parameters on the server,
  // from your own data, and check who is asking: whoever can call this route spends your renders.
  const { call, idempotencyKey } = (await request.json()) as RenderBody;
  if (!METHODS.includes(call?.method)) {
    return Response.json({ error: { code: "invalid_parameter", message: "Unknown tool." } }, { status: 400 });
  }

  try {
    const job = await render(call, idempotencyKey);
    return Response.json({ job });
  } catch (error) {
    return errorResponse(error);
  }
}

import { errorResponse, isConfigured } from '@/lib/gepetto';
import { render } from '@/lib/render';
import { TOOL_IDS, type RenderRequest } from '@/lib/tools';

// A render takes 15 to 90 seconds, sometimes more: the request waits for the image.
// 300 s is the most a Vercel Hobby function can last (800 s on Pro).
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json({ error: { code: 'missing_api_key', message: 'Set GEPETTO_API_KEY (npx @gepetto/cli init), then restart the server.' } }, { status: 500 });
  }
  const body = (await request.json()) as RenderRequest;
  if (!TOOL_IDS.includes(body.tool) || typeof body.url !== 'string') {
    return Response.json({ error: { code: 'invalid_parameter', message: 'Unknown tool or missing photo.' } }, { status: 400 });
  }
  try {
    const job = await render(body);
    return Response.json({ job });
  } catch (e) {
    return errorResponse(e);
  }
}

// Your own photos: the browser sends the file straight to your Vercel Blob store, then the studio gives its public URL
// to Gepetto. Gepetto stores nothing for you. Another storage (S3, R2, Supabase...) works the same way: an upload that
// returns a public URL. Without BLOB_READ_WRITE_TOKEN, this route is off and the studio hides "Upload".
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { uploadsEnabled } from '@/lib/gepetto';

export async function POST(request: Request) {
  if (!uploadsEnabled()) {
    return Response.json({ error: 'Uploads are off: connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN), see the README.' }, { status: 404 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      // Anyone who can open the studio can upload: protect the app before you deploy it publicly.
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        maximumSizeInBytes: 40 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

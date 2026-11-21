"use client";

// The studio, the only page: pick a photo, pick a tool, get the image.
// To follow a click: makeImage() below, then lib/sdk-calls.ts (the call sent), app/api/render/route.ts and
// lib/render.ts (the server makes it with @gepetto/sdk).
import { useEffect, useState } from "react";
import type { AccountSummary, RecentJob } from "@/lib/gepetto";
import { SAMPLES } from "@/lib/samples";
import { sdkCallFor } from "@/lib/sdk-calls";
import { loadRecent, loadStudio, renderImage, uploadPhoto, type ApiError, type StudioData } from "@/lib/studio-api";
import {
  buttonLabel,
  defaultChoices,
  needsMask,
  workingDetail,
  workingTitle,
  type Choices,
  type ToolId,
} from "@/lib/tools";
import { CodePeek } from "./code-peek";
import { Header } from "./header";
import { exportMask, type Stroke } from "./painter";
import { PhotoPicker, type Photo } from "./photo-picker";
import { RenderButton, RenderStatus } from "./render-button";
import { RecentRenders, ResultActions } from "./result-bar";
import { Setup } from "./setup";
import { Stage, type Size, type StageMode } from "./stage";
import { ToolOptions } from "./tool-options";
import { TOOL_ICONS, ToolPicker } from "./tool-picker";

/** Where the image is at. */
type RenderState =
  | { status: "idle" }
  | { status: "working"; tool: ToolId; title: string; detail: string; startedAt: number }
  | { status: "done"; photoUrl: string; output: string; jobId: string; seconds: number }
  | { status: "failed"; error: ApiError };

// Errors about the key itself: the page then shows how to set it
const KEY_ERRORS = ["missing_api_key", "invalid_api_key", "api_key_inactive"];

export function Studio() {
  // What the server gives at start (lists of ids, account, renders), then kept up to date
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [recent, setRecent] = useState<RecentJob[]>([]);

  // The photo, or null while "Upload" is chosen and no file is sent yet
  const [photo, setPhoto] = useState<Photo | null>({ url: SAMPLES[0].url, source: "sample" });
  const [photoSize, setPhotoSize] = useState<Size | null>(null);
  const [urlError, setUrlError] = useState<ApiError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // The tool and the choices of the panel
  const [tool, setTool] = useState<ToolId>("furnish");
  const [choices, setChoices] = useState<Choices>(() => defaultChoices(null));

  // The painted zone, for the tools that use a mask. Kept after a render, to paint again.
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brush, setBrush] = useState(40);

  const [renderState, setRenderState] = useState<RenderState>({ status: "idle" });

  const lists = studio?.status === "ready" ? studio.lists : null;
  const maskNeeded = needsMask(tool, choices);

  // On load: the lists of ids, the account and the latest renders
  useEffect(() => {
    loadStudio().then((data) => {
      setStudio(data);
      if (data.status === "ready") {
        setChoices(defaultChoices(data.lists));
        setAccount(data.account);
        setRecent(data.recent);
      }
      if (data.status === "error") setRenderState({ status: "failed", error: data.error });
    });
  }, []);

  /** The main button: one image, from start to finish. */
  async function makeImage() {
    if (!photo || !photoSize) return;

    // 1. The painted zone, as a black and white PNG (only for the tools that use a mask)
    const mask = maskNeeded ? exportMask(strokes, photoSize) : "";

    // 2. The SDK call for the current choices: the one shown under "The SDK call"
    const call = sdkCallFor(tool, choices, photo.url, mask);

    // 3. The server makes it and answers when the image is ready. A new idempotency key for each click.
    const startedAt = Date.now();
    setUrlError(null);
    setRenderState({
      status: "working",
      tool,
      title: workingTitle(tool, choices),
      detail: workingDetail(tool, choices, lists),
      startedAt,
    });
    const result = await renderImage(call, crypto.randomUUID());

    // 4. An error about a pasted URL goes under the URL field; any other, under the button
    if (!result.ok) {
      if (result.error.param === "url" && photo.source === "url") {
        setUrlError(result.error);
        setRenderState({ status: "idle" });
      } else {
        setRenderState({ status: "failed", error: result.error });
      }
      return;
    }

    // 5. The result, compared with the photo. Loaded first, so that the comparison opens complete.
    await preloadImage(result.output);
    setRenderState({
      status: "done",
      photoUrl: photo.url,
      output: result.output,
      jobId: result.jobId,
      seconds: Math.round((Date.now() - startedAt) / 1000),
    });
    refreshRecent();
  }

  async function refreshRecent() {
    const data = await loadRecent();
    if (!data) return;
    setAccount(data.account);
    setRecent(data.recent);
  }

  async function uploadFile(file: File) {
    changePhoto(null);
    setUploadProgress(0);
    try {
      const url = await uploadPhoto(file, setUploadProgress);
      changePhoto({ url, source: "upload" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The upload failed.";
      setRenderState({ status: "failed", error: { code: "upload_failed", message } });
    } finally {
      setUploadProgress(null);
    }
  }

  /** A new photo starts with nothing painted, and no result. */
  function changePhoto(next: Photo | null) {
    if (next?.url !== photo?.url) {
      setPhotoSize(null);
      setStrokes([]);
    }
    setPhoto(next);
    setUrlError(null);
    setRenderState({ status: "idle" });
  }

  /** Leaves the before/after view, back to the photo. */
  function closeResult() {
    if (renderState.status === "done") setRenderState({ status: "idle" });
  }

  function changeTool(next: ToolId) {
    if (next !== tool) closeResult();
    setTool(next);
  }

  function changeChoices(next: Choices) {
    // Switching between the whole room and a painted zone goes back to the photo
    if (next.declutterMode !== choices.declutterMode || next.furnishMode !== choices.furnishMode) closeResult();
    setChoices(next);
  }

  /** What the big frame shows. */
  function stageMode(): StageMode {
    if (!photo) return "dropzone";
    if (renderState.status === "working") return "working";
    if (renderState.status === "done" && renderState.photoUrl === photo.url) return "result";
    if (maskNeeded) return "paint";
    return "photo";
  }

  // No key, or a wrong one: how to set it
  if (studio?.status === "no_key") return <Setup />;
  if (studio?.status === "error" && KEY_ERRORS.includes(studio.error.code)) {
    return <Setup message={studio.error.message} />;
  }

  const mode = stageMode();
  const result = renderState.status === "done" && mode === "result" ? renderState : null;
  const uploads = studio?.status === "ready" && studio.uploads;

  // The main button works once everything it needs is there
  const nothingPainted = maskNeeded && strokes.length === 0;
  const missingColor = tool === "walls" && choices.wallType === "custom" && choices.customWallColor.trim() === "";
  const canRender =
    studio?.status === "ready" &&
    photo !== null &&
    photoSize !== null &&
    renderState.status !== "working" &&
    !nothingPainted &&
    !missingColor;

  let hint = "Usually 15 to 90 seconds";
  if (nothingPainted) hint = "Paint the zone on the photo first";
  else if (missingColor) hint = "Type the colour you want";

  const ToolIcon = TOOL_ICONS[tool];
  const WorkingIcon = renderState.status === "working" ? TOOL_ICONS[renderState.tool] : ToolIcon;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Header account={account} />

      <div className="flex flex-1 flex-col gap-4 px-4 lg:min-h-0 lg:flex-row lg:px-6">
        <main className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
          <Stage
            mode={mode}
            photoUrl={photo?.url ?? null}
            photoSize={photoSize}
            onPhotoLoad={setPhotoSize}
            onPhotoError={() => {
              if (photo?.source === "url") {
                setUrlError({ code: "image_unreachable", message: "This URL does not open as an image in the browser." });
              }
            }}
            paint={{
              strokes,
              onStrokesChange: setStrokes,
              brush,
              onBrushChange: setBrush,
              hint: tool === "declutter" ? "Paint over what to remove" : "Paint the zone to furnish",
            }}
            working={
              renderState.status === "working"
                ? {
                    title: renderState.title,
                    detail: renderState.detail,
                    startedAt: renderState.startedAt,
                    icon: <WorkingIcon aria-hidden className="size-5" strokeWidth={1.75} />,
                  }
                : null
            }
            output={result ? result.output : null}
            upload={{ enabled: uploads, progress: uploadProgress, onFile: uploadFile }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {recent.length > 0 && (
              <RecentRenders
                recent={recent}
                highlighted={[photo?.url ?? null, result ? result.output : null]}
                onPick={(url) => changePhoto({ url, source: "render" })}
              />
            )}
            {result && (
              <ResultActions
                output={result.output}
                onPaintAgain={maskNeeded ? () => setRenderState({ status: "idle" }) : null}
                onEdit={() => changePhoto({ url: result.output, source: "render" })}
              />
            )}
          </div>
        </main>

        <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[18px] lg:w-[352px] lg:flex-none lg:overflow-y-auto">
          <section className="flex flex-col gap-2.5">
            <h2 className="section-title">Photo</h2>
            <PhotoPicker
              photo={photo}
              onPick={changePhoto}
              uploads={uploads}
              urlError={urlError}
              onUrlError={setUrlError}
            />
          </section>

          <div aria-hidden className="-mx-[18px] h-px bg-line-soft" />

          <section className="flex flex-col gap-2.5">
            <h2 className="section-title">Edit</h2>
            <ToolPicker tool={tool} onChange={changeTool} />
            <ToolOptions tool={tool} choices={choices} onChange={changeChoices} lists={lists} />
          </section>

          {/* Always in sight: at the bottom of the panel (computer) or of the screen (phone) */}
          <div className="sticky bottom-0 z-10 -mx-[18px] bg-white px-[18px] py-3 shadow-[0_-1px_0_#efeeea]">
            <RenderButton
              label={buttonLabel(tool, choices)}
              icon={ToolIcon}
              working={renderState.status === "working"}
              disabled={!canRender}
              onClick={makeImage}
            />
            <RenderStatus
              error={renderState.status === "failed" ? renderState.error : null}
              done={renderState.status === "done" ? renderState : null}
              hint={hint}
            />
          </div>

          <div className="lg:mt-auto">
            <CodePeek call={sdkCallFor(tool, choices, photo?.url ?? "", "")} />
          </div>
        </aside>
      </div>

      <footer className="flex h-11 flex-none items-center justify-end px-4 lg:px-6">
        <a
          href="https://gepettoapp.com"
          className="inline-flex h-[30px] items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-3 text-[12.5px] text-ink-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local logo */}
          <img src="/gepetto.png" alt="" className="size-[18px] rounded-[5px]" />
          <span>
            Powered by <strong className="font-semibold text-ink">Gepetto</strong>
          </span>
        </a>
      </footer>
    </div>
  );
}

/** Resolves when the image is in the browser's cache (or could not be loaded). */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

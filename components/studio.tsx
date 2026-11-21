"use client";

// The studio: pick a photo, pick a tool, get the image. The page never sees the API key: it calls this app's
// own routes (app/api/*), which call Gepetto with @gepetto/sdk (lib/render.ts).
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, Brush, Check, CircleAlert, CloudSun, Download, Eraser, Grid2x2, ImageUp, KeyRound,
  Link as LinkIcon, Maximize2, PaintRoller, Palette, Sofa, WandSparkles, type LucideIcon,
} from "lucide-react";
import type { AccountSummary, Lists, Option, RecentJob } from "@/lib/gepetto";
import { SAMPLES, thumbnail } from "@/lib/samples";
import {
  actionLabel, needsMask, paramsFor, progressLabel, sdkCall, TOOL_IDS, TOOL_LABELS,
  type RenderRequest, type Settings, type ToolId,
} from "@/lib/tools";
import { CodePeek } from "./code-peek";
import { exportMask, type Stroke } from "./painter";
import { Setup } from "./setup";
import { Stage, type StageMode } from "./stage";
import { Grid2, Segmented, SelectField, SwitchRow } from "./ui";

const REPO_URL = "https://github.com/Gepetto-AI/gepetto-nextjs-starter";

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  enhance: WandSparkles,
  declutter: Eraser,
  furnish: Sofa,
  sunshine: CloudSun,
  "creative-redesign": Palette,
  walls: PaintRoller,
  floor: Grid2x2,
  upscale: Maximize2,
};

/** Names of the API's tools, for the Recent renders. */
const JOB_TOOL_NAMES: Record<string, string> = {
  enhance: "Enhance", declutter: "Declutter", furnish: "Furnish", sunshine: "Blue sky",
  "creative-redesign": "Restyle", surfaces: "Walls and floors", upscale: "Upscale",
};

const DEFAULTS: Settings = {
  straighten: false,
  declutterMode: "room",
  keepKitchen: false,
  keepBathroom: false,
  keepFireplace: false,
  furnishMode: "room",
  roomId: "living_room",
  zoneTarget: "room:living_room",
  styleId: "scandinave",
  skyId: "sunny",
  lightProjection: false,
  poolLight: false,
  addLeafs: false,
  redesignRoomId: "living_room",
  preserveFloor: false,
  wallType: "egg_shell",
  customWallColor: "",
  preserveCeiling: false,
  floorType: "parquet",
  includeBaseboard: false,
  resolution: "4k",
};

type Boot =
  | { configured: false }
  | { configured: true; uploads: boolean; lists: Lists; account: AccountSummary; recent: RecentJob[] };

interface ApiError {
  code: string;
  message: string;
  param?: string | null;
  jobId?: string | null;
}

interface Photo {
  url: string;
  source: "sample" | "url" | "upload" | "render";
}

type Run =
  | { state: "idle" }
  | { state: "rendering"; startedAt: number; title: string; subtitle: string; tool: ToolId }
  | { state: "done"; photoUrl: string; after: string; jobId: string; seconds: number }
  | { state: "error"; error: ApiError };

/** The preferred id if the API has it, else the first one. */
function pick(options: Option[], preferred: string): string {
  return options.some((o) => o.id === preferred) ? preferred : options[0]?.id ?? preferred;
}

function nameOf(options: Option[] | undefined, id: string): string {
  return options?.find((o) => o.id === id)?.name ?? id;
}

/** One line under the title while the image is being made. */
function describe(tool: ToolId, s: Settings, l: Lists | null): string {
  switch (tool) {
    case "enhance": return s.straighten ? "Light, colours and verticals" : "Light and colours";
    case "declutter": return s.declutterMode === "erase" ? "The painted objects" : "The whole room";
    case "furnish": {
      if (s.furnishMode === "room") return `${nameOf(l?.autoRooms, s.roomId)} · ${nameOf(l?.styles, s.styleId)}`;
      const [kind, id] = s.zoneTarget.split(":");
      return `${nameOf(kind === "piece" ? l?.furniture : l?.zoneRooms, id)} · ${nameOf(l?.styles, s.styleId)}`;
    }
    case "sunshine": return nameOf(l?.skies, s.skyId);
    case "creative-redesign": return `${nameOf(l?.allRooms, s.redesignRoomId)} · ${nameOf(l?.styles, s.styleId)}`;
    case "walls": return s.wallType === "custom" ? s.customWallColor : nameOf(l?.walls, s.wallType);
    case "floor": return nameOf(l?.floors, s.floorType);
    case "upscale": return s.resolution.toUpperCase();
  }
}

export function Studio() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [bootError, setBootError] = useState<ApiError | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [recent, setRecent] = useState<RecentJob[]>([]);

  const [photo, setPhoto] = useState<Photo | null>({ url: SAMPLES[0].url, source: "sample" });
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [uploadPicked, setUploadPicked] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<ApiError | null>(null);

  const [tool, setTool] = useState<ToolId>("furnish");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const set = (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    // Switching between the whole room and a painted zone goes back to editing the photo
    if ("declutterMode" in patch || "furnishMode" in patch) setRun((r) => (r.state === "done" ? { state: "idle" } : r));
  };

  // The painted zone (masks): kept here so that it survives a render
  const strokesRef = useRef<Stroke[]>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [strokesVersion, setStrokesVersion] = useState(0);
  const [brush, setBrush] = useState(40);

  const [run, setRun] = useState<Run>({ state: "idle" });
  const [now, setNow] = useState(0); // set when a render starts, then every second

  const lists = boot?.configured ? boot.lists : null;

  useEffect(() => {
    fetch("/api/bootstrap")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setBootError(data.error);
          return;
        }
        if (data.configured) {
          const l: Lists = data.lists;
          setSettings((s) => ({
            ...s,
            roomId: pick(l.autoRooms, s.roomId),
            zoneTarget: `room:${pick(l.zoneRooms, "living_room")}`,
            styleId: pick(l.styles, s.styleId),
            skyId: pick(l.skies, s.skyId),
            redesignRoomId: pick(l.allRooms, s.redesignRoomId),
            wallType: pick(l.walls.filter((w) => w.id !== "custom"), s.wallType),
            floorType: pick(l.floors, s.floorType),
          }));
          setAccount(data.account);
          setRecent(data.recent);
        }
        setBoot(data);
      })
      .catch(() => setBootError({ code: "connection_error", message: "Could not reach the server." }));
  }, []);

  // A clock for the elapsed time, only while an image is being made
  useEffect(() => {
    if (run.state !== "rendering") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run.state]);

  const resetStrokes = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    setStrokesVersion((v) => v + 1);
  };

  const choosePhoto = (next: Photo) => {
    if (next.url !== photo?.url) {
      setPhotoSize(null);
      resetStrokes();
    }
    setPhoto(next);
    setUploadPicked(false);
    setUrlError(null);
    setRun({ state: "idle" });
  };

  const refresh = async () => {
    const res = await fetch("/api/recent");
    if (!res.ok) return;
    const data = await res.json();
    setAccount(data.account);
    setRecent(data.recent);
  };

  async function uploadFile(file: File) {
    setUploadPicked(true);
    setPhoto(null);
    setUploadProgress(0);
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (p) => setUploadProgress(Math.round(p.percentage)),
      });
      choosePhoto({ url: blob.url, source: "upload" });
    } catch (e) {
      setRun({ state: "error", error: { code: "upload_failed", message: e instanceof Error ? e.message : "The upload failed." } });
    } finally {
      setUploadProgress(null);
    }
  }

  const maskTool = needsMask(tool, settings);
  const params = paramsFor(tool, settings);

  async function start() {
    if (!photo || !photoSize || run.state === "rendering") return;
    const mask = maskTool ? exportMask(strokesRef.current, photoSize.width, photoSize.height) : null;
    if (maskTool && !mask) return;
    const request: RenderRequest = {
      tool,
      url: photo.url,
      ...(mask ? { mask } : {}),
      params,
      idempotencyKey: crypto.randomUUID(), // one per click
    };
    const startedAt = Date.now();
    setNow(startedAt);
    setUrlError(null);
    setRun({ state: "rendering", startedAt, title: progressLabel(tool, settings), subtitle: describe(tool, settings, lists), tool });
    try {
      const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const data = await res.json();
      if (!res.ok) {
        const error: ApiError = data.error;
        if (error.param === "url" && photo.source === "url") {
          setUrlError(error);
          setRun({ state: "idle" });
        } else {
          setRun({ state: "error", error });
        }
        return;
      }
      // Keep the waiting card until the image is in the browser, so that the comparison opens complete
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = data.job.output;
      });
      setRun({ state: "done", photoUrl: photo.url, after: data.job.output, jobId: data.job.id, seconds: Math.round((Date.now() - startedAt) / 1000) });
      refresh();
    } catch {
      setRun({ state: "error", error: { code: "connection_error", message: "Could not reach the server. Is it still running?" } });
    }
  }

  if (boot && !boot.configured) return <Setup />;
  if (bootError && ["missing_api_key", "invalid_api_key", "api_key_inactive"].includes(bootError.code)) return <Setup message={bootError.message} />;

  const mode: StageMode =
    uploadPicked && !photo ? "empty"
      : run.state === "rendering" ? "rendering"
        : run.state === "done" && run.photoUrl === photo?.url ? "result"
          : maskTool ? "paint"
            : "photo";
  const result = run.state === "done" && mode === "result" ? run : null;
  const missingColor = tool === "walls" && settings.wallType === "custom" && !settings.customWallColor.trim();
  const ready = !!boot && !!photo && !!photoSize && run.state !== "rendering" && !(maskTool && strokeCount === 0) && !missingColor;
  const samples = boot?.configured && boot.uploads ? SAMPLES.slice(0, 3) : SAMPLES;
  const ActionIcon = TOOL_ICONS[tool];
  const seconds = run.state === "rendering" ? Math.max(0, Math.round((now - run.startedAt) / 1000)) : 0;
  const RenderIcon = run.state === "rendering" ? TOOL_ICONS[run.tool] : ActionIcon;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex h-16 flex-none items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local logo */}
          <img src="/gepetto.png" alt="Gepetto" className="size-7 rounded-[7px]" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Photo Studio</span>
          <span aria-hidden className="hidden h-4 w-px bg-[#d6d4cf] md:block" />
          <span className="hidden truncate text-[13px] text-ink-3 md:block">
            Example app for <code className="font-mono text-[12.5px] text-ink-2">@gepetto/sdk</code>
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {account && (
            <span className="mr-1 inline-flex h-8 items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] text-ink-2 sm:mr-2">
              <KeyRound aria-hidden className="size-3.5" />
              <span className="font-medium text-ink">{account.keyType === "test" ? "Test key" : "Live key"}</span>
              {account.testRendersLeft !== null && (
                <>
                  <span aria-hidden className="size-[3px] rounded-full bg-[#a1a1aa]" />
                  <span>{account.testRendersLeft} <span className="hidden sm:inline">renders </span>left</span>
                </>
              )}
            </span>
          )}
          <a href="https://docs.gepettoapp.com" className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white sm:inline-flex">
            <BookOpen aria-hidden className="size-[15px]" />Docs
          </a>
          <a href={REPO_URL} className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white sm:inline-flex">
            GitHub<ArrowUpRight aria-hidden className="size-3.5" />
          </a>
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 lg:min-h-0 lg:flex-row lg:px-6">
        <main className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
          <Stage
            mode={mode}
            photoUrl={photo?.url ?? null}
            photoSize={photoSize}
            onPhotoSize={setPhotoSize}
            onPhotoError={() => {
              if (photo?.source === "url") setUrlError({ code: "image_unreachable", message: "This URL does not open as an image in the browser." });
            }}
            after={result?.after ?? null}
            strokesRef={strokesRef}
            strokesVersion={strokesVersion}
            hasStrokes={strokeCount > 0}
            brush={brush}
            onBrush={setBrush}
            onStroke={() => setStrokeCount(strokesRef.current.length)}
            onUndo={() => {
              strokesRef.current = strokesRef.current.slice(0, -1);
              setStrokeCount(strokesRef.current.length);
              setStrokesVersion((v) => v + 1);
            }}
            onClear={resetStrokes}
            paintHint={tool === "declutter" ? "Paint over what to remove" : "Paint the zone to furnish"}
            rendering={run.state === "rendering" ? { title: run.title, subtitle: run.subtitle, seconds, icon: <RenderIcon aria-hidden className="size-5" strokeWidth={1.75} /> } : null}
            uploads={!!(boot?.configured && boot.uploads)}
            uploadProgress={uploadProgress}
            onFile={uploadFile}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {recent.length > 0 && (
              <div className="flex min-w-0 items-center gap-3.5">
                <h2 className="section-title">Recent</h2>
                <div className="flex gap-2 overflow-x-auto p-1">
                  {recent.slice(0, 6).map((job) => {
                    const on = photo?.url === job.output || result?.after === job.output;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        title={`${JOB_TOOL_NAMES[job.tool] ?? job.tool}: keep editing this render`}
                        aria-label={`${JOB_TOOL_NAMES[job.tool] ?? job.tool}: keep editing this render`}
                        onClick={() => choosePhoto({ url: job.output, source: "render" })}
                        className={`flex-none rounded-[9px] ${on ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- renders served by Gepetto */}
                        <img src={job.output} alt="" loading="lazy" className="size-12 rounded-[9px] object-cover lg:size-14" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {result && (
              <div className="flex flex-wrap items-center gap-2">
                {maskTool && (
                  <button type="button" onClick={() => setRun({ state: "idle" })} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-medium">
                    <Brush aria-hidden className="size-[15px] text-ink-2" />Paint again
                  </button>
                )}
                <button type="button" onClick={() => navigator.clipboard.writeText(result.after)} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-medium">
                  <LinkIcon aria-hidden className="size-[15px] text-ink-2" />Copy link
                </button>
                <a href={result.after} target="_blank" rel="noreferrer" download className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-medium">
                  <Download aria-hidden className="size-[15px] text-ink-2" />Download
                </a>
                <button type="button" onClick={() => choosePhoto({ url: result.after, source: "render" })} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-ink bg-white px-3.5 text-[13px] font-medium">
                  Edit this result<ArrowRight aria-hidden className="size-[15px]" />
                </button>
              </div>
            )}
          </div>
        </main>

        <aside className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[18px] lg:w-[352px] lg:flex-none lg:overflow-y-auto">
          <section className="flex flex-col gap-2.5">
            <h2 className="section-title">Photo</h2>
            <div className="grid grid-cols-4 gap-2">
              {boot?.configured && boot.uploads && (
                <button
                  type="button"
                  aria-pressed={uploadPicked}
                  onClick={() => { setUploadPicked(true); setPhoto(null); setRun({ state: "idle" }); }}
                  className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border bg-[#fafaf9] text-xs font-medium ${uploadPicked ? "border-line outline-2 outline-offset-2 outline-ink" : "border-dashed border-[#cfcdc7]"}`}
                >
                  <ImageUp aria-hidden className="size-5" strokeWidth={1.75} />Upload
                </button>
              )}
              {samples.map((sample) => {
                const on = photo?.url === sample.url;
                return (
                  <button
                    key={sample.url}
                    type="button"
                    aria-label={sample.label}
                    aria-pressed={on}
                    onClick={() => choosePhoto({ url: sample.url, source: "sample" })}
                    className={`rounded-xl ${on ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnails */}
                    <img src={thumbnail(sample.url)} alt="" className="aspect-square w-full rounded-xl object-cover" />
                  </button>
                );
              })}
            </div>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = urlInput.trim();
                if (!/^https?:\/\/\S+$/.test(value)) {
                  setUrlError({ code: "invalid_url", message: "Paste the full http(s) URL of a photo." });
                  return;
                }
                choosePhoto({ url: value, source: "url" });
              }}
            >
              <div className={`flex h-10 items-center rounded-[10px] border pl-3 pr-1 ${urlError ? "border-danger shadow-[0_0_0_3px_rgba(180,35,24,.08)]" : "border-line focus-within:border-ink"}`}>
                <label htmlFor="photo-url" className="sr-only">Image URL</label>
                <input
                  id="photo-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Or paste a public image URL"
                  aria-invalid={!!urlError}
                  aria-describedby={urlError ? "url-error" : undefined}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
                />
                <button type="submit" aria-label="Use this URL" className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-canvas">
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </div>
              {urlError && (
                <p id="url-error" role="alert" className="flex gap-2 text-[12.5px] leading-normal text-danger">
                  <CircleAlert aria-hidden className="mt-px size-[15px] flex-none" />
                  <span>
                    {urlError.message}{" "}
                    <code className="whitespace-nowrap rounded-md bg-[#fdf2f1] px-1.5 py-px font-mono text-[11.5px] text-[#912018]">{urlError.code}</code>
                  </span>
                </p>
              )}
            </form>
          </section>

          <div aria-hidden className="-mx-[18px] h-px bg-line-soft" />

          <section className="flex flex-col gap-2.5">
            <h2 className="section-title">Edit</h2>
            <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
              {TOOL_IDS.map((id) => {
                const Icon = TOOL_ICONS[id];
                const on = id === tool;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTool(id);
                      // Another tool: back to the photo (the render stays in Recent)
                      if (id !== tool) setRun((r) => (r.state === "done" ? { state: "idle" } : r));
                    }}
                    className={`flex h-10 flex-none items-center gap-2.5 rounded-full border px-3.5 text-left text-sm font-medium lg:h-9 lg:rounded-[10px] lg:px-3 ${on ? "border-ink bg-[#fafaf9] shadow-[inset_0_0_0_.5px_#18181b]" : "border-line bg-white"}`}
                  >
                    <Icon aria-hidden className={`size-[18px] flex-none ${on ? "text-ink" : "text-ink-3"}`} strokeWidth={1.75} />
                    {TOOL_LABELS[id]}
                  </button>
                );
              })}
            </div>
            <ToolOptions tool={tool} settings={settings} set={set} lists={lists} />
          </section>

          {/* Always in sight: at the bottom of the panel (computer) or of the screen (phone) while it scrolls */}
          <div className="sticky bottom-0 z-10 -mx-[18px] bg-white px-[18px] py-3 shadow-[0_-1px_0_#efeeea]">
            <button
              type="button"
              disabled={!ready}
              onClick={start}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-ink text-[15px] font-semibold text-white disabled:border disabled:border-line disabled:bg-canvas disabled:text-ink-2"
            >
              {run.state === "rendering" ? "Working…" : <><ActionIcon aria-hidden className="size-[18px]" />{actionLabel(tool, settings)}</>}
            </button>
            <Status run={run} needsPaint={maskTool && strokeCount === 0} missingColor={missingColor} />
          </div>

          <div className="lg:mt-auto">
            <CodePeek code={sdkCall(tool, params, maskTool)} />
          </div>
        </aside>
      </div>

      <footer className="flex h-11 flex-none items-center justify-end px-4 lg:px-6">
        <a href="https://gepettoapp.com" className="inline-flex h-[30px] items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-3 text-[12.5px] text-ink-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local logo */}
          <img src="/gepetto.png" alt="" className="size-[18px] rounded-[5px]" />
          <span>Powered by <strong className="font-semibold text-ink">Gepetto</strong></span>
        </a>
      </footer>
    </div>
  );
}

/** The line under the main button: how long it takes, what is missing, or how it went. */
function Status({ run, needsPaint, missingColor }: { run: Run; needsPaint: boolean; missingColor: boolean }) {
  if (run.state === "error") {
    return (
      <p role="alert" className="mt-2.5 flex gap-2 text-[12.5px] leading-normal text-danger">
        <CircleAlert aria-hidden className="mt-px size-[15px] flex-none" />
        <span>
          {run.error.message}{" "}
          <code className="whitespace-nowrap rounded-md bg-[#fdf2f1] px-1.5 py-px font-mono text-[11.5px] text-[#912018]">{run.error.code}</code>
        </span>
      </p>
    );
  }
  if (run.state === "done") {
    return (
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <Check aria-hidden className="size-3.5 text-ok" strokeWidth={2.25} />
        <span className="text-ink">Done in {run.seconds} s</span>
        <span aria-hidden className="size-[3px] rounded-full bg-[#a1a1aa]" />
        <code className="truncate font-mono text-[11.5px]" title={run.jobId}>{run.jobId.length > 18 ? `${run.jobId.slice(0, 11)}…${run.jobId.slice(-5)}` : run.jobId}</code>
      </p>
    );
  }
  const text = needsPaint ? "Paint the zone on the photo first" : missingColor ? "Type the colour you want" : "Usually 15 to 90 seconds";
  return <p className="mt-2 text-center text-xs text-ink-3">{text}</p>;
}

/** The options of the selected tool. */
function ToolOptions({ tool, settings: s, set, lists }: {
  tool: ToolId;
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  lists: Lists | null;
}) {
  const options = (items: Option[] | undefined) => (items ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>);
  const styleField = (label = "Style") => (
    <SelectField id="style" label={label} value={s.styleId} onChange={(styleId) => set({ styleId })}>{options(lists?.styles)}</SelectField>
  );

  switch (tool) {
    case "enhance":
      return <SwitchRow label="Straighten verticals" checked={s.straighten} onChange={(straighten) => set({ straighten })} />;

    case "declutter":
      return (
        <>
          <Segmented label="What to remove" value={s.declutterMode} onChange={(declutterMode) => set({ declutterMode })}
            options={[{ value: "room", label: "Whole room" }, { value: "erase", label: "Erase objects" }]} />
          {s.declutterMode === "room" && (
            <>
              <SwitchRow label="Keep the kitchen" checked={s.keepKitchen} onChange={(keepKitchen) => set({ keepKitchen })} />
              <SwitchRow label="Keep the bathroom" checked={s.keepBathroom} onChange={(keepBathroom) => set({ keepBathroom })} />
              <SwitchRow label="Keep the fireplace" checked={s.keepFireplace} onChange={(keepFireplace) => set({ keepFireplace })} />
            </>
          )}
        </>
      );

    case "furnish":
      return (
        <>
          <Segmented label="What to furnish" value={s.furnishMode} onChange={(furnishMode) => set({ furnishMode })}
            options={[{ value: "room", label: "Whole room" }, { value: "zone", label: "A zone" }]} />
          <Grid2>
            {s.furnishMode === "room" ? (
              <SelectField id="room" label="Room" value={s.roomId} onChange={(roomId) => set({ roomId })}>{options(lists?.autoRooms)}</SelectField>
            ) : (
              <SelectField id="furnish-as" label="Furnish as" value={s.zoneTarget} onChange={(zoneTarget) => set({ zoneTarget })}>
                <optgroup label="A room">
                  {(lists?.zoneRooms ?? []).map((o) => <option key={o.id} value={`room:${o.id}`}>{o.name}</option>)}
                </optgroup>
                <optgroup label="One piece of furniture">
                  {(lists?.furniture ?? []).map((o) => <option key={o.id} value={`piece:${o.id}`}>{o.name}</option>)}
                </optgroup>
              </SelectField>
            )}
            {styleField()}
          </Grid2>
        </>
      );

    case "sunshine":
      return (
        <>
          <SelectField id="sky" label="Sky" value={s.skyId} onChange={(skyId) => set({ skyId })}>{options(lists?.skies)}</SelectField>
          <SwitchRow label="Sunlight and shadows" checked={s.lightProjection} onChange={(lightProjection) => set({ lightProjection })} />
          <SwitchRow label="Leaves on bare trees" checked={s.addLeafs} onChange={(addLeafs) => set({ addLeafs })} />
          <SwitchRow label="Pool lights (sunset skies)" checked={s.poolLight} onChange={(poolLight) => set({ poolLight })} />
        </>
      );

    case "creative-redesign":
      return (
        <>
          <Grid2>
            <SelectField id="redesign-room" label="Room" value={s.redesignRoomId} onChange={(redesignRoomId) => set({ redesignRoomId })}>{options(lists?.allRooms)}</SelectField>
            {styleField()}
          </Grid2>
          <SwitchRow label="Keep the floor" checked={s.preserveFloor} onChange={(preserveFloor) => set({ preserveFloor })} />
        </>
      );

    case "walls":
      return (
        <>
          <SelectField id="wall" label="Colour" value={s.wallType} onChange={(wallType) => set({ wallType })}>{options(lists?.walls)}</SelectField>
          {s.wallType === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-color" className="text-xs font-medium text-ink-2">Your colour, in English</label>
              <input id="custom-color" maxLength={30} value={s.customWallColor} onChange={(e) => set({ customWallColor: e.target.value })}
                placeholder="sage green" className="h-10 rounded-[10px] border border-line px-3 text-sm outline-none focus:border-ink" />
            </div>
          )}
          <SwitchRow label="Keep the ceiling" checked={s.preserveCeiling} onChange={(preserveCeiling) => set({ preserveCeiling })} />
        </>
      );

    case "floor":
      return (
        <>
          <SelectField id="floor" label="Floor" value={s.floorType} onChange={(floorType) => set({ floorType })}>{options(lists?.floors)}</SelectField>
          <SwitchRow label="Change the baseboards too" checked={s.includeBaseboard} onChange={(includeBaseboard) => set({ includeBaseboard })} />
        </>
      );

    case "upscale":
      return (
        <Segmented label="Resolution" value={s.resolution} onChange={(resolution) => set({ resolution })}
          options={[{ value: "2k", label: "2K · 4 MP" }, { value: "4k", label: "4K · 16 MP" }]} />
      );
  }
}

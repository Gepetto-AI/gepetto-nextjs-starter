"use client";

// The photo, big. Depending on the moment: a place to drop a photo, the photo, the photo being painted,
// the photo while the image is being made, or the photo compared with the result.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsLeftRight, ImageUp } from "lucide-react";
import { PaintLayer, type Stroke } from "./painter";
import { photoLabelStyle } from "./ui";

export type StageMode = "dropzone" | "photo" | "paint" | "working" | "result";

export interface Size {
  width: number;
  height: number;
}

interface StageProps {
  mode: StageMode;
  photoUrl: string | null;
  photoSize: Size | null;
  onPhotoLoad: (size: Size) => void;
  onPhotoError: () => void;
  /** For "paint". */
  paint: {
    strokes: Stroke[];
    onStrokesChange: (strokes: Stroke[]) => void;
    brush: number;
    onBrushChange: (size: number) => void;
    hint: string;
  };
  /** For "working". */
  working: { title: string; detail: string; startedAt: number; icon: ReactNode } | null;
  /** For "result": the URL of the image made. */
  output: string | null;
  /** For "dropzone". */
  upload: { enabled: boolean; progress: number | null; onFile: (file: File) => void };
}

export function Stage({ mode, photoUrl, photoSize, onPhotoLoad, onPhotoError, paint, working, output, upload }: StageProps) {
  const photoRef = useRef<HTMLImageElement>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [outputRatio, setOutputRatio] = useState<{ url: string; ratio: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // A photo that loaded before the page became interactive fires no onLoad: read its size here
  useEffect(() => {
    const image = photoRef.current;
    if (image && image.complete && image.naturalWidth > 0) {
      onPhotoLoad({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, [photoUrl, onPhotoLoad]);

  // The frame takes the proportions of the photo, or of the result when they are compared
  let ratio = photoSize ? photoSize.width / photoSize.height : 3 / 2;
  if (mode === "result" && outputRatio && outputRatio.url === output) ratio = outputRatio.ratio;
  const [frameRef, box] = useFitBox(ratio);

  // With uploads on, a photo can be dropped anywhere on the frame
  function handleDragOver(event: React.DragEvent) {
    if (!upload.enabled) return;
    event.preventDefault();
    setDragging(true);
  }

  function handleDrop(event: React.DragEvent) {
    if (!upload.enabled) return;
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) upload.onFile(file);
  }

  return (
    <div
      ref={frameRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-[14px] lg:aspect-auto lg:min-h-0 lg:flex-1 ${
        mode === "dropzone"
          ? "border-[1.5px] border-dashed border-[#cfcdc7] bg-[#fafaf9]"
          : "bg-stage shadow-[0_1px_2px_rgba(24,24,27,.05),0_12px_32px_rgba(24,24,27,.08)]"
      }`}
    >
      {mode === "dropzone" && <Dropzone progress={upload.progress} onFile={upload.onFile} />}

      {mode !== "dropzone" && photoUrl && brokenUrl === photoUrl && (
        <p className="px-6 text-center text-sm text-ink-3">This photo could not be loaded.</p>
      )}

      {mode !== "dropzone" && photoUrl && brokenUrl !== photoUrl && (
        <div className="relative" style={{ width: box.width, height: box.height }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote photos of any size */}
          <img
            ref={photoRef}
            src={photoUrl}
            alt={mode === "result" ? "Before" : "The photo to edit"}
            className={`absolute inset-0 size-full ${mode === "result" ? "object-cover" : "object-fill"} ${
              mode === "working" ? "brightness-[.92] saturate-[.55]" : ""
            }`}
            onLoad={(event) =>
              onPhotoLoad({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
            onError={() => {
              setBrokenUrl(photoUrl);
              onPhotoError();
            }}
          />

          {mode === "paint" && <PaintLayer {...paint} />}

          {mode === "working" && working && <WorkingCard {...working} />}

          {mode === "result" && output && (
            <BeforeAfter output={output} onLoad={(outputRatio) => setOutputRatio({ url: output, ratio: outputRatio })} />
          )}

          {mode === "photo" && photoSize && (
            <span className={`${photoLabelStyle} right-3.5 font-mono font-normal`}>
              {photoSize.width} × {photoSize.height}
            </span>
          )}
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[14px] border-2 border-dashed border-ink bg-white/80 text-lg font-semibold">
          Drop to upload
        </div>
      )}
    </div>
  );
}

/** The largest box of this ratio that fits in the element (the photo is shown whole, as big as possible). */
function useFitBox(ratio: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width / height > ratio) setBox({ width: height * ratio, height });
      else setBox({ width, height: width / ratio });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ratio]);

  return [ref, box] as const;
}

/** "Upload" chosen: drop a photo, or browse your files. */
function Dropzone({ progress, onFile }: { progress: number | null; onFile: (file: File) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-[18px] border border-line bg-white">
        <ImageUp aria-hidden className="size-7" strokeWidth={1.5} />
      </div>

      {progress !== null ? (
        <p className="text-lg font-semibold">Uploading… {progress}%</p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xl font-semibold tracking-tight">Drop a photo here</p>
            <p className="text-sm text-ink-2">
              or{" "}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="font-medium text-ink underline underline-offset-[3px]"
              >
                browse your files
              </button>
            </p>
          </div>
          <p className="text-xs text-ink-3">
            JPEG, PNG, WebP or HEIC · saved to your storage, then sent to Gepetto by its URL
          </p>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** While the image is being made: what is being done, and for how long. */
function WorkingCard({ title, detail, startedAt, icon }: {
  title: string;
  detail: string;
  startedAt: number;
  icon: ReactNode;
}) {
  const seconds = useSecondsSince(startedAt);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  // The bar fills in about 75 seconds and stops at 92 %: it shows time passing, not a measured progress
  const barWidth = Math.min(92, (seconds / 75) * 100);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-canvas/40 p-4">
      <div
        role="status"
        className="flex w-[360px] max-w-full flex-col gap-[18px] rounded-2xl bg-white p-[22px] shadow-[0_1px_2px_rgba(24,24,27,.06),0_20px_48px_rgba(24,24,27,.16)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-canvas">{icon}</div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{title}</span>
            <span className="truncate text-[13px] text-ink-3">{detail}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-ink" style={{ width: `${barWidth}%` }} />
          </div>
          <div className="flex justify-between text-xs text-ink-3">
            <span className="font-mono text-ink">{clock}</span>
            <span>usually 15 to 90 s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Seconds since `start`, updated every second. */
function useSecondsSince(start: number): number {
  const [now, setNow] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.round((now - start) / 1000));
}

/** The result laid over the photo and cut at the slider: the photo on the left, the result on the right. */
function BeforeAfter({ output, onLoad }: { output: string; onLoad: (ratio: number) => void }) {
  const [split, setSplit] = useState(50);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- the render, served by Gepetto */}
      <img
        src={output}
        alt="After"
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
        onLoad={(event) => onLoad(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
      />

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_.5px_rgba(24,24,27,.15)]"
        style={{ left: `${split}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(24,24,27,.22)]">
          <ChevronsLeftRight aria-hidden className="size-[18px]" />
        </div>
      </div>

      <span className={`${photoLabelStyle} left-3.5`}>Before</span>
      <span className={`${photoLabelStyle} right-3.5`}>After</span>

      {/* An invisible slider over the whole image: drag anywhere */}
      <label htmlFor="compare" className="sr-only">
        Compare before and after
      </label>
      <input
        id="compare"
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        className="absolute inset-0 m-0 size-full cursor-ew-resize opacity-0"
      />
    </>
  );
}

"use client";

// The photo, big: as it is, being painted (masks), being rendered, or compared with the result.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Brush, ChevronsLeftRight, ImageUp, Undo2 } from "lucide-react";
import { Painter, type Stroke } from "./painter";

export type StageMode = "empty" | "photo" | "paint" | "rendering" | "result";

/** The largest box of this ratio that fits in the element. */
function useFit(ratio: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox(width / height > ratio ? { width: height * ratio, height } : { width, height: width / ratio });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio]);
  return [ref, box] as const;
}

const chip = "pointer-events-none absolute top-3.5 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-ink/60 px-2.5 text-xs font-medium text-white";

export function Stage(props: {
  mode: StageMode;
  photoUrl: string | null;
  photoSize: { width: number; height: number } | null;
  onPhotoSize: (size: { width: number; height: number }) => void;
  onPhotoError: () => void;
  after: string | null;
  // Painting a mask
  strokesRef: RefObject<Stroke[]>;
  strokesVersion: number;
  hasStrokes: boolean;
  brush: number;
  onBrush: (size: number) => void;
  onStroke: () => void;
  onUndo: () => void;
  onClear: () => void;
  paintHint: string;
  // Rendering
  rendering: { title: string; subtitle: string; seconds: number; icon: ReactNode } | null;
  // Your own photos
  uploads: boolean;
  uploadProgress: number | null;
  onFile: (file: File) => void;
}) {
  const { mode, photoUrl, photoSize, after } = props;
  const [afterSize, setAfterSize] = useState<{ url: string; ratio: number } | null>(null);
  const [compare, setCompare] = useState(50);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { onPhotoSize } = props;

  // A photo already loaded before the page became interactive fires no onLoad: read its size here
  useEffect(() => {
    const img = photoRef.current;
    if (img?.complete && img.naturalWidth) onPhotoSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, [photoUrl, onPhotoSize]);

  const photoRatio = photoSize ? photoSize.width / photoSize.height : 3 / 2;
  const afterRatio = afterSize && afterSize.url === after ? afterSize.ratio : null;
  const ratio = mode === "result" && afterRatio ? afterRatio : photoRatio;
  const [frameRef, box] = useFit(ratio);

  const dropProps = props.uploads ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) props.onFile(file);
    },
  } : {};

  return (
    <div
      ref={frameRef}
      {...dropProps}
      className={`relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-[14px] lg:aspect-auto lg:min-h-0 lg:flex-1 ${mode === "empty" ? "border-[1.5px] border-dashed border-[#cfcdc7] bg-[#fafaf9]" : "bg-stage shadow-[0_1px_2px_rgba(24,24,27,.05),0_12px_32px_rgba(24,24,27,.08)]"}`}
    >
      {mode === "empty" ? (
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-[18px] border border-line bg-white">
            <ImageUp aria-hidden className="size-7" strokeWidth={1.5} />
          </div>
          {props.uploadProgress !== null ? (
            <p className="text-lg font-semibold">Uploading… {props.uploadProgress}%</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xl font-semibold tracking-tight">Drop a photo here</p>
                <p className="text-sm text-ink-2">
                  or{" "}
                  <button type="button" onClick={() => fileInput.current?.click()} className="font-medium text-ink underline underline-offset-[3px]">
                    browse your files
                  </button>
                </p>
              </div>
              <p className="text-xs text-ink-3">JPEG, PNG, WebP or HEIC · saved to your storage, then sent to Gepetto by its URL</p>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) props.onFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : photoUrl && failedUrl === photoUrl ? (
        <p className="px-6 text-center text-sm text-ink-3">This photo could not be loaded.</p>
      ) : photoUrl ? (
        <div className="relative" style={{ width: box.width, height: box.height }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote photos of any size */}
          <img
            ref={photoRef}
            src={photoUrl}
            alt={mode === "result" ? "Before" : "The photo to edit"}
            className={`absolute inset-0 size-full ${mode === "result" ? "object-cover" : "object-fill"} ${mode === "rendering" ? "brightness-[.92] saturate-[.55]" : ""}`}
            onLoad={(e) => props.onPhotoSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            onError={() => {
              setFailedUrl(photoUrl);
              props.onPhotoError();
            }}
          />

          {mode === "paint" && (
            <>
              <Painter strokesRef={props.strokesRef} version={props.strokesVersion} brush={props.brush} onStroke={props.onStroke} />
              <span className={`${chip} left-3.5`}><Brush aria-hidden className="size-3.5" />{props.paintHint}</span>
              <div role="toolbar" aria-label="Brush" className="absolute bottom-4 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1 rounded-[14px] bg-white pl-3.5 pr-1.5 shadow-[0_1px_2px_rgba(24,24,27,.08),0_10px_28px_rgba(24,24,27,.16)]">
                <label htmlFor="brush" className="mr-1.5 text-[13px] font-medium text-ink-2">Brush</label>
                <input id="brush" type="range" min={10} max={120} value={props.brush} onChange={(e) => props.onBrush(Number(e.target.value))} className="brush-range mr-2 w-24 sm:w-30" />
                <span aria-hidden className="mx-1 h-5 w-px bg-line" />
                <button type="button" onClick={props.onUndo} disabled={!props.hasStrokes} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium disabled:text-ink-3"><Undo2 aria-hidden className="size-4" />Undo</button>
                <button type="button" onClick={props.onClear} disabled={!props.hasStrokes} className="inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium disabled:text-ink-3">Clear</button>
              </div>
            </>
          )}

          {mode === "rendering" && props.rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas/40 p-4">
              <div role="status" className="flex w-[360px] max-w-full flex-col gap-[18px] rounded-2xl bg-white p-[22px] shadow-[0_1px_2px_rgba(24,24,27,.06),0_20px_48px_rgba(24,24,27,.16)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-canvas">{props.rendering.icon}</div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{props.rendering.title}</span>
                    <span className="truncate text-[13px] text-ink-3">{props.rendering.subtitle}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(92, (props.rendering.seconds / 75) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-ink-3">
                    <span className="font-mono text-ink">{Math.floor(props.rendering.seconds / 60)}:{String(props.rendering.seconds % 60).padStart(2, "0")}</span>
                    <span>usually 15 to 90 s</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "result" && after && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- the render, served by Gepetto */}
              <img
                src={after}
                alt="After"
                className="absolute inset-0 size-full object-cover"
                style={{ clipPath: `inset(0 0 0 ${compare}%)` }}
                onLoad={(e) => setAfterSize({ url: after, ratio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight })}
              />
              <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_.5px_rgba(24,24,27,.15)]" style={{ left: `${compare}%` }}>
                <div className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(24,24,27,.22)]">
                  <ChevronsLeftRight aria-hidden className="size-[18px]" />
                </div>
              </div>
              <span className={`${chip} left-3.5`}>Before</span>
              <span className={`${chip} right-3.5`}>After</span>
              <label htmlFor="compare" className="sr-only">Compare before and after</label>
              <input id="compare" type="range" min={0} max={100} value={compare} onChange={(e) => setCompare(Number(e.target.value))} className="absolute inset-0 m-0 size-full cursor-ew-resize opacity-0" />
            </>
          )}

          {mode === "photo" && photoSize && (
            <span className={`${chip} right-3.5 font-mono font-normal`}>{photoSize.width} × {photoSize.height}</span>
          )}
        </div>
      ) : null}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[14px] border-2 border-dashed border-ink bg-white/80 text-lg font-semibold">
          Drop to upload
        </div>
      )}
    </div>
  );
}

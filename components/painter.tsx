"use client";

// Paint a zone on the photo. What is painted becomes the mask: a black image with the zone in white, at the photo's
// proportions, sent to the API as a data URL (no storage needed).
import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface Stroke {
  /** Brush diameter, as a fraction of the photo's width. */
  size: number;
  /** Points, as fractions of the photo's width and height. */
  points: [number, number][];
}

const MAX_MASK_SIDE = 2048;

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], width: number, height: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    ctx.lineWidth = stroke.size * width;
    ctx.beginPath();
    stroke.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * width, y * height) : ctx.lineTo(x * width, y * height)));
    // A single click paints a dot
    if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] * width + 0.01, stroke.points[0][1] * height);
    ctx.stroke();
  }
}

/** The mask as a PNG data URL: black, the painted zone in white, at the photo's proportions (2048 px at most). */
export function exportMask(strokes: Stroke[], photoWidth: number, photoHeight: number): string | null {
  if (strokes.length === 0) return null;
  const scale = Math.min(1, MAX_MASK_SIDE / Math.max(photoWidth, photoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(photoWidth * scale));
  canvas.height = Math.max(1, Math.round(photoHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStrokes(ctx, strokes, canvas.width, canvas.height, "#fff");
  return canvas.toDataURL("image/png");
}

export function Painter({ strokesRef, version, brush, onStroke }: {
  /** The strokes, kept by the page so that they survive a render. */
  strokesRef: RefObject<Stroke[]>;
  /** Changes when the strokes change from outside (undo, clear). */
  version: number;
  /** Brush diameter in screen pixels. */
  brush: number;
  onStroke: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawStrokes(ctx, strokesRef.current, width, height, "#3b82f6");
  }, [strokesRef]);

  useEffect(() => {
    redraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw, version]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ];
  };

  const moveCursor = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    cursor.style.transform = `translate(${e.clientX - rect.left - brush / 2}px, ${e.clientY - rect.top - brush / 2}px)`;
    cursor.style.opacity = "1";
  };

  return (
    <div className="absolute inset-0 touch-none">
      {/* Strokes drawn opaque on a translucent canvas: where they cross, the colour does not get darker */}
      <canvas
        ref={canvasRef}
        aria-label="Paint the zone on the photo"
        className="absolute inset-0 size-full cursor-none opacity-[.42]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const width = e.currentTarget.getBoundingClientRect().width;
          strokesRef.current = [...strokesRef.current, { size: brush / width, points: [point(e)] }];
          redraw();
        }}
        onPointerMove={(e) => {
          moveCursor(e);
          if (!drawing.current) return;
          strokesRef.current[strokesRef.current.length - 1].points.push(point(e));
          redraw();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          onStroke();
        }}
        onPointerLeave={() => {
          if (cursorRef.current) cursorRef.current.style.opacity = "0";
        }}
      />
      <div
        ref={cursorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full border-[1.5px] border-white opacity-0 shadow-[0_0_0_1px_rgba(24,24,27,.3)]"
        style={{ width: brush, height: brush }}
      />
    </div>
  );
}

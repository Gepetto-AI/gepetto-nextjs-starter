"use client";

// Paint a zone on the photo. What is painted becomes the mask sent to Gepetto: a black image with the zone in
// white, at the proportions of the photo, as a PNG data URL. Nothing to host.
import { useCallback, useEffect, useRef } from "react";
import { Brush, Undo2 } from "lucide-react";
import { photoLabelStyle } from "./ui";

export interface Stroke {
  /** Brush diameter, as a fraction of the photo's width. */
  size: number;
  /** The points, as fractions of the photo's width and height (from 0 to 1). */
  points: [number, number][];
}

/** The largest side of the mask: enough for any zone, and a light PNG. */
const MASK_MAX_SIDE = 2048;

/** The mask: black, with the painted zone in white, at the proportions of the photo, as a PNG data URL. */
export function exportMask(strokes: Stroke[], photo: { width: number; height: number }): string {
  const scale = Math.min(1, MASK_MAX_SIDE / Math.max(photo.width, photo.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(photo.width * scale);
  canvas.height = Math.round(photo.height * scale);

  const context = canvas.getContext("2d");
  if (!context) return "";
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawStrokes(context, strokes, canvas.width, canvas.height, "white");
  return canvas.toDataURL("image/png");
}

function drawStrokes(
  context: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number,
  color: string,
) {
  context.strokeStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const stroke of strokes) {
    context.lineWidth = stroke.size * width;
    context.beginPath();
    const [firstX, firstY] = stroke.points[0];
    context.moveTo(firstX * width, firstY * height);
    for (const [x, y] of stroke.points) context.lineTo(x * width, y * height);
    // A click without moving paints a dot
    if (stroke.points.length === 1) context.lineTo(firstX * width + 0.01, firstY * height);
    context.stroke();
  }
}

/** The painting layer over the photo, with its brush toolbar. */
export function PaintLayer({ strokes, onStrokesChange, brush, onBrushChange, hint }: {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  /** Brush diameter, in pixels on screen. */
  brush: number;
  onBrushChange: (size: number) => void;
  hint: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  // The stroke being drawn: added to `strokes` when the pointer is released
  const currentStroke = useRef<Stroke | null>(null);

  // Draws the strokes, sharp on any screen
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { width, height } = canvas.getBoundingClientRect();
    const density = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * density)) {
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, width, height);

    const allStrokes = currentStroke.current ? [...strokes, currentStroke.current] : strokes;
    drawStrokes(context, allStrokes, width, height, "#3b82f6");
  }, [strokes]);

  // Redraw when the strokes change (undo, clear) and when the photo is resized
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  /** Where the pointer is, as fractions of the photo's width and height. */
  function pointOnPhoto(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = event.currentTarget.getBoundingClientRect().width;
    currentStroke.current = { size: brush / width, points: [pointOnPhoto(event)] };
    redraw();
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    moveBrushCircle(event);
    if (!currentStroke.current) return;
    currentStroke.current.points.push(pointOnPhoto(event));
    redraw();
  }

  function endStroke() {
    if (!currentStroke.current) return;
    onStrokesChange([...strokes, currentStroke.current]);
    currentStroke.current = null;
  }

  /** The circle that shows the size of the brush follows the pointer. */
  function moveBrushCircle(event: React.PointerEvent<HTMLCanvasElement>) {
    const circle = cursorRef.current;
    if (!circle) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left - brush / 2;
    const y = event.clientY - box.top - brush / 2;
    circle.style.transform = `translate(${x}px, ${y}px)`;
    circle.style.opacity = "1";
  }

  function hideBrushCircle() {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  }

  return (
    <>
      <div className="absolute inset-0 touch-none">
        {/* The strokes are opaque on a see-through canvas: where they cross, the colour stays the same */}
        <canvas
          ref={canvasRef}
          aria-label="Paint the zone on the photo"
          className="absolute inset-0 size-full cursor-none opacity-[.42]"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={hideBrushCircle}
        />
        <div
          ref={cursorRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full border-[1.5px] border-white opacity-0 shadow-[0_0_0_1px_rgba(24,24,27,.3)]"
          style={{ width: brush, height: brush }}
        />
      </div>

      <span className={`${photoLabelStyle} left-3.5`}>
        <Brush aria-hidden className="size-3.5" />
        {hint}
      </span>

      <div
        role="toolbar"
        aria-label="Brush"
        className="absolute bottom-4 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1 rounded-[14px] bg-white pl-3.5 pr-1.5 shadow-[0_1px_2px_rgba(24,24,27,.08),0_10px_28px_rgba(24,24,27,.16)]"
      >
        <label htmlFor="brush" className="mr-1.5 text-[13px] font-medium text-ink-2">
          Brush
        </label>
        <input
          id="brush"
          type="range"
          min={10}
          max={120}
          value={brush}
          onChange={(event) => onBrushChange(Number(event.target.value))}
          className="brush-range mr-2 w-24 sm:w-30"
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-line" />
        <button
          type="button"
          onClick={() => onStrokesChange(strokes.slice(0, -1))}
          disabled={strokes.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium enabled:hover:bg-canvas disabled:text-ink-3"
        >
          <Undo2 aria-hidden className="size-4" />
          Undo
        </button>
        <button
          type="button"
          onClick={() => onStrokesChange([])}
          disabled={strokes.length === 0}
          className="inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium enabled:hover:bg-canvas disabled:text-ink-3"
        >
          Clear
        </button>
      </div>
    </>
  );
}

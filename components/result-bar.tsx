"use client";

// Under the photo: the latest renders, and what to do with a result.
import { ArrowRight, Brush, Download, Link as LinkIcon } from "lucide-react";
import type { RecentJob } from "@/lib/gepetto";
import { buttonStyle, strongButtonStyle } from "./ui";

/** The names of the API's tools, as the panel says them. */
const TOOL_NAMES: Record<string, string> = {
  enhance: "Enhance",
  declutter: "Declutter",
  furnish: "Furnish",
  sunshine: "Blue sky",
  "creative-redesign": "Restyle",
  surfaces: "Walls, floors and finishes",
  upscale: "Upscale",
};

/** The latest renders of the key. Click one to keep editing it. */
export function RecentRenders({ recent, highlighted, onPick }: {
  recent: RecentJob[];
  /** The images on screen: their thumbnail is outlined. */
  highlighted: (string | null)[];
  onPick: (url: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <h2 className="section-title">Recent</h2>
      <div className="flex gap-2 overflow-x-auto p-1">
        {recent.slice(0, 6).map((job) => {
          const label = `${TOOL_NAMES[job.tool] ?? job.tool}: keep editing this render`;
          const selected = highlighted.includes(job.output);
          return (
            <button
              key={job.id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onPick(job.output)}
              className={`flex-none rounded-[9px] ${selected ? "outline-2 outline-offset-2 outline-ink" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- renders served by Gepetto */}
              <img src={job.output} alt="" loading="lazy" className="size-12 rounded-[9px] object-cover lg:size-14" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What to do with the image made. */
export function ResultActions({ output, onPaintAgain, onEdit }: {
  output: string;
  /** Only for the tools that use a painted zone. */
  onPaintAgain: (() => void) | null;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onPaintAgain && (
        <button type="button" onClick={onPaintAgain} className={buttonStyle}>
          <Brush aria-hidden className="size-[15px] text-ink-2" />
          Paint again
        </button>
      )}
      <button type="button" onClick={() => navigator.clipboard.writeText(output)} className={buttonStyle}>
        <LinkIcon aria-hidden className="size-[15px] text-ink-2" />
        Copy link
      </button>
      <a href={output} target="_blank" rel="noreferrer" download className={buttonStyle}>
        <Download aria-hidden className="size-[15px] text-ink-2" />
        Download
      </a>
      <button type="button" onClick={onEdit} className={strongButtonStyle}>
        Edit this result
        <ArrowRight aria-hidden className="size-[15px]" />
      </button>
    </div>
  );
}

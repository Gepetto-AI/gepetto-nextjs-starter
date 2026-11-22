"use client";

import {
  CloudSun,
  Eraser,
  Grid2x2,
  Maximize2,
  PaintRoller,
  Palette,
  Sofa,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { TOOLS, type ToolId } from "@/lib/tools";

export const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  enhance: WandSparkles,
  declutter: Eraser,
  furnish: Sofa,
  sunshine: CloudSun,
  restyle: Palette,
  walls: PaintRoller,
  floor: Grid2x2,
  finish: Sparkles,
  upscale: Maximize2,
};

/** The nine tools: a grid on a computer, a row of chips on a phone. */
export function ToolPicker({ tool, onChange }: { tool: ToolId; onChange: (tool: ToolId) => void }) {
  return (
    <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
      {TOOLS.map(({ id, name }) => {
        const Icon = TOOL_ICONS[id];
        const selected = id === tool;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`flex h-10 flex-none items-center gap-2.5 rounded-full border px-3.5 text-left text-sm font-medium lg:h-9 lg:rounded-[10px] lg:px-3 ${
              selected ? "border-ink bg-[#fafaf9] shadow-[inset_0_0_0_.5px_#18181b]" : "border-line bg-white"
            }`}
          >
            <Icon
              aria-hidden
              className={`size-[18px] flex-none ${selected ? "text-ink" : "text-ink-3"}`}
              strokeWidth={1.75}
            />
            {name}
          </button>
        );
      })}
    </div>
  );
}

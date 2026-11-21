"use client";

// "The SDK call": the call the server makes for the current choices (lib/sdk-calls.ts, then lib/render.ts).
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { SdkCall } from "@/lib/sdk-calls";

export function CodePeek({ call }: { call: SdkCall }) {
  const [copied, setCopied] = useState(false);
  const code = printSdkCall(call);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">The SDK call</h2>
        <button
          type="button"
          aria-label="Copy the code"
          onClick={copy}
          className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-canvas"
        >
          {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto rounded-[10px] border border-line-soft bg-[#fafaf9] px-3.5 py-3 font-mono text-xs leading-normal text-ink">
        {highlight(code)}
      </pre>
    </section>
  );
}

/** The call as JavaScript, the way you would write it. */
function printSdkCall({ method, params }: SdkCall): string {
  const lines = [`const job = await gepetto.${method}({`];
  for (const [key, value] of Object.entries(params)) {
    // false is the default of every option: not worth a line
    if (value === undefined || value === false) continue;

    if (key === "url") lines.push("  url: photo.url,");
    else if (key === "mask") lines.push("  mask: maskDataUrl, // canvas.toDataURL('image/png')");
    else if (typeof value === "string") lines.push(`  ${key}: '${value}',`);
    else lines.push(`  ${key}: ${value},`);
  }
  lines.push("});");
  return lines.join("\n");
}

// The parts of the code shown in colour: strings, comments, a few keywords, the method name
const COLORED = /('[^']*'|\/\/.*|\bconst\b|\bawait\b|\btrue\b|gepetto\.\w+)/;

function highlight(code: string) {
  return code.split(COLORED).map((part, index) => {
    if (part.startsWith("//")) return <span key={index} className="text-ink-3">{part}</span>;
    if (part.startsWith("'")) return <span key={index} className="text-[#047857]">{part}</span>;
    if (part === "const" || part === "await" || part === "true") {
      return <span key={index} className="text-[#7c3aed]">{part}</span>;
    }
    if (part.startsWith("gepetto.")) {
      return (
        <span key={index}>
          gepetto.<span className="font-medium">{part.slice("gepetto.".length)}</span>
        </span>
      );
    }
    return part;
  });
}

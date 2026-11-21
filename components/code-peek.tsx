"use client";

// "The SDK call": the exact call the server makes for the current settings (see lib/render.ts).
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const TOKEN = /(\/\/.*$)|('[^']*')|\b(const|await|true|false)\b|(?<=gepetto\.)(\w+)/gm;

function highlight(code: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index > last) parts.push(code.slice(last, m.index));
    const [text, comment, string, keyword] = m;
    const className = comment ? "text-ink-3" : string ? "text-[#047857]" : keyword ? "text-[#7c3aed]" : "font-medium";
    parts.push(<span key={m.index} className={className}>{text}</span>);
    last = m.index + text.length;
  }
  parts.push(code.slice(last));
  return parts;
}

export function CodePeek({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">The SDK call</h2>
        <button
          type="button"
          aria-label="Copy the code"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
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

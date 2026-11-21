"use client";

import { Check, type LucideIcon } from "lucide-react";
import type { ApiError } from "@/lib/studio-api";
import { ErrorLine } from "./ui";

/** The main button: says what you get. */
export function RenderButton({ label, icon: Icon, working, disabled, onClick }: {
  label: string;
  icon: LucideIcon;
  working: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-ink text-[15px] font-semibold text-white disabled:border disabled:border-line disabled:bg-canvas disabled:text-ink-2"
    >
      {working ? (
        "Working…"
      ) : (
        <>
          <Icon aria-hidden className="size-[18px]" />
          {label}
        </>
      )}
    </button>
  );
}

/** The line under the button: the error, or how long the last image took, or a hint. */
export function RenderStatus({ error, done, hint }: {
  error: ApiError | null;
  done: { seconds: number; jobId: string } | null;
  hint: string;
}) {
  if (error) {
    return (
      <div className="mt-2.5">
        <ErrorLine error={error} />
      </div>
    );
  }

  if (done) {
    // The job id, shortened: idem_2856…475ec
    const shortId = done.jobId.length > 18 ? `${done.jobId.slice(0, 11)}…${done.jobId.slice(-5)}` : done.jobId;
    return (
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <Check aria-hidden className="size-3.5 text-ok" strokeWidth={2.25} />
        <span className="text-ink">Done in {done.seconds} s</span>
        <span aria-hidden className="size-[3px] rounded-full bg-[#a1a1aa]" />
        <code className="truncate font-mono text-[11.5px]" title={done.jobId}>
          {shortId}
        </code>
      </p>
    );
  }

  return <p className="mt-2 text-center text-xs text-ink-3">{hint}</p>;
}

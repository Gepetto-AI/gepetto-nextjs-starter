"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Two or three choices side by side (Whole room / A zone). */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-[10px] bg-canvas p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`h-[30px] flex-1 rounded-lg text-[13px] ${on ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(24,24,27,.1),0_0_0_.5px_rgba(24,24,27,.06)]" : "font-medium text-ink-2 hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled select, with the options in groups or not. */
export function SelectField({ id, label, value, onChange, children }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 appearance-none truncate rounded-[10px] border border-line bg-white pl-3 pr-8 text-sm text-ink outline-none focus-visible:border-ink"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-ink-3" />
    </div>
  );
}

/** An on/off option. */
export function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-line px-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

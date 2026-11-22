"use client";

// Small building blocks shared by the studio.
import { ChevronDown, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiError } from "@/lib/studio-api";

/** The small white buttons under the photo (Copy link, Download...), for a <button> or a link. */
export const buttonStyle =
  "inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-medium transition-colors hover:border-[#d6d4cf] hover:bg-[#fafaf9]";

/** The same, with a dark border: the action to take next. */
export const strongButtonStyle =
  "inline-flex h-9 items-center gap-2 rounded-[10px] border border-ink bg-white px-3.5 text-[13px] font-medium transition-colors hover:bg-[#fafaf9]";

/** The dark labels over the photo (Before, After, the size of the photo). */
export const photoLabelStyle =
  "pointer-events-none absolute top-3.5 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-ink/60 px-2.5 " +
  "text-xs font-medium text-white";

/** An error: its message for people, and its code for developers. */
export function ErrorLine({ error, id }: { error: ApiError; id?: string }) {
  return (
    <p id={id} role="alert" className="flex gap-2 text-[12.5px] leading-normal text-danger">
      <CircleAlert aria-hidden className="mt-px size-[15px] flex-none" />
      <span>
        {error.message}{" "}
        <code className="whitespace-nowrap rounded-md bg-[#fdf2f1] px-1.5 py-px font-mono text-[11.5px] text-[#912018]">
          {error.code}
        </code>
      </span>
    </p>
  );
}

/** Two choices side by side (Whole room / A zone). */
export function Segmented<Value extends string>({ label, value, options, onChange }: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-[10px] bg-canvas p-[3px]">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`h-[30px] flex-1 rounded-lg text-[13px] ${
              selected
                ? "bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(24,24,27,.1),0_0_0_.5px_rgba(24,24,27,.06)]"
                : "font-medium text-ink-2 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A list to choose from, with its label. */
export function SelectField({ id, label, value, onChange, children }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-[10px] border border-line bg-white pl-3 pr-8 text-sm text-ink outline-none transition-colors hover:border-[#d6d4cf] focus-visible:border-ink"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-ink-3" />
    </div>
  );
}

/** An on/off option. */
export function SwitchRow({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-line px-3 text-sm transition-colors hover:bg-[#fafaf9]">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function TwoColumns({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

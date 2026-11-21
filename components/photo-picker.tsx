"use client";

// Choose the photo: one of yours (Upload), a sample, or any public image URL.
import { useState } from "react";
import { ArrowRight, ImageUp } from "lucide-react";
import { SAMPLES, thumbnail } from "@/lib/samples";
import type { ApiError } from "@/lib/studio-api";
import { ErrorLine } from "./ui";

export interface Photo {
  url: string;
  /** Where it comes from. The errors about a pasted URL are shown under the URL field. */
  source: "sample" | "url" | "upload" | "render";
}

export function PhotoPicker({ photo, onPick, uploads, urlError, onUrlError }: {
  /** The current photo, or null while "Upload" is chosen. */
  photo: Photo | null;
  onPick: (photo: Photo | null) => void;
  /** Is a storage connected? Then "Upload" is shown. */
  uploads: boolean;
  urlError: ApiError | null;
  onUrlError: (error: ApiError) => void;
}) {
  const [urlInput, setUrlInput] = useState("");

  function submitUrl(event: React.FormEvent) {
    event.preventDefault();
    const url = urlInput.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      onUrlError({ code: "invalid_url", message: "Paste the full http(s) URL of a photo." });
      return;
    }
    onPick({ url, source: "url" });
  }

  // With uploads on, the Upload tile takes the place of the fourth sample
  const samples = uploads ? SAMPLES.slice(0, 3) : SAMPLES;
  const selectedTile = "outline-2 outline-offset-2 outline-ink";

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {uploads && (
          <button
            type="button"
            aria-pressed={photo === null}
            onClick={() => onPick(null)}
            className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border bg-[#fafaf9] text-xs font-medium ${
              photo === null ? `border-line ${selectedTile}` : "border-dashed border-[#cfcdc7]"
            }`}
          >
            <ImageUp aria-hidden className="size-5" strokeWidth={1.75} />
            Upload
          </button>
        )}

        {samples.map((sample) => {
          const selected = photo?.url === sample.url;
          return (
            <button
              key={sample.url}
              type="button"
              aria-label={sample.label}
              aria-pressed={selected}
              onClick={() => onPick({ url: sample.url, source: "sample" })}
              className={`rounded-xl ${selected ? selectedTile : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnails */}
              <img src={thumbnail(sample.url)} alt="" className="aspect-square w-full rounded-xl object-cover" />
            </button>
          );
        })}
      </div>

      <form className="flex flex-col gap-2" onSubmit={submitUrl}>
        <div
          className={`flex h-10 items-center rounded-[10px] border pl-3 pr-1 ${
            urlError ? "border-danger shadow-[0_0_0_3px_rgba(180,35,24,.08)]" : "border-line focus-within:border-ink"
          }`}
        >
          <label htmlFor="photo-url" className="sr-only">
            Image URL
          </label>
          <input
            id="photo-url"
            type="url"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="Or paste a public image URL"
            aria-invalid={urlError !== null}
            aria-describedby={urlError ? "url-error" : undefined}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            aria-label="Use this URL"
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-canvas"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
        {urlError && <ErrorLine id="url-error" error={urlError} />}
      </form>
    </>
  );
}

import { ArrowUpRight, BookOpen, KeyRound } from "lucide-react";
import type { AccountSummary } from "@/lib/gepetto";

const REPO_URL = "https://github.com/Gepetto-AI/gepetto-nextjs-starter";

/** The top bar: the name of the app, the key in use, the links. */
export function Header({ account }: { account: AccountSummary | null }) {
  return (
    <header className="flex h-16 flex-none items-center justify-between gap-3 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- local logo */}
        <img src="/gepetto.png" alt="Gepetto" className="size-7 rounded-[7px]" />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Photo Studio</span>
        <span aria-hidden className="hidden h-4 w-px bg-[#d6d4cf] md:block" />
        <span className="hidden truncate text-[13px] text-ink-3 md:block">
          Example app for <code className="font-mono text-[12.5px] text-ink-2">@gepetto/sdk</code>
        </span>
      </div>

      <nav className="flex items-center gap-1">
        {account && <KeyBadge account={account} />}
        <a
          href="https://docs.gepettoapp.com"
          className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white sm:inline-flex"
        >
          <BookOpen aria-hidden className="size-[15px]" />
          Docs
        </a>
        <a
          href={REPO_URL}
          className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white sm:inline-flex"
        >
          GitHub
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      </nav>
    </header>
  );
}

/** Test or live key, and with a test key, the free renders left. */
function KeyBadge({ account }: { account: AccountSummary }) {
  return (
    <span className="mr-1 inline-flex h-8 items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] text-ink-2 sm:mr-2">
      <KeyRound aria-hidden className="size-3.5" />
      <span className="font-medium text-ink">{account.keyType === "test" ? "Test key" : "Live key"}</span>
      {account.testRendersLeft !== null && (
        <>
          <span aria-hidden className="size-[3px] rounded-full bg-[#a1a1aa]" />
          <span>
            {account.testRendersLeft} <span className="hidden sm:inline">renders </span>left
          </span>
        </>
      )}
    </span>
  );
}

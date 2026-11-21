// Shown until the server has an API key.
export function Setup({ message }: { message?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-[480px] flex-col gap-5 rounded-2xl border border-line bg-white p-7">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local logo */}
          <img src="/gepetto.png" alt="Gepetto" className="size-8 rounded-lg" />
          <h1 className="text-lg font-semibold tracking-tight">Connect your Gepetto API key</h1>
        </div>
        {message && <p className="rounded-[10px] bg-[#fdf2f1] px-3 py-2 text-[13px] leading-normal text-danger">{message}</p>}
        <p className="text-sm leading-relaxed text-ink-2">
          The studio calls Gepetto from its server, with your key. Get a free test key (200 real renders) in two commands, in this folder:
        </p>
        <pre className="m-0 rounded-[10px] bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-white">
          npx @gepetto/cli login{"\n"}npx @gepetto/cli init
        </pre>
        <p className="text-sm leading-relaxed text-ink-2">
          <code className="font-mono text-[13px] text-ink">init</code> writes <code className="font-mono text-[13px] text-ink">GEPETTO_API_KEY</code> to <code className="font-mono text-[13px] text-ink">.env</code>. Then restart <code className="font-mono text-[13px] text-ink">npm run dev</code>.
        </p>
        <a href="https://docs.gepettoapp.com" className="text-sm font-medium text-ink underline underline-offset-[3px]">Gepetto API documentation</a>
      </div>
    </main>
  );
}

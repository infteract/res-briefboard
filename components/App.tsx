"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePartialJson } from "@/lib/partial-json";
import { MAX_BRIEF_LENGTH, SAMPLE_BRIEFS, type PartialBoard } from "@/lib/schema";
import Board from "@/components/Board";

type Phase = "idle" | "streaming" | "done" | "error";
type Mode = "live" | "replay";

export default function App() {
  const [brief, setBrief] = useState(SAMPLE_BRIEFS[0].brief);
  const [board, setBoard] = useState<PartialBoard | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("streaming");
    setBoard(null);
    setError(null);
    setReceived(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const headerMode = res.headers.get("X-Briefboard-Mode");
      setMode(headerMode === "live" ? "live" : "replay");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let lastParse = 0;

      const applyParse = (force: boolean) => {
        const now = performance.now();
        if (!force && now - lastParse < 24) return;
        lastParse = now;
        const parsed = parsePartialJson(acc);
        if (parsed && typeof parsed === "object") setBoard(parsed as PartialBoard);
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setReceived(acc.length);
        applyParse(false);
      }
      acc += decoder.decode();
      applyParse(true);
      setPhase("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }, [brief]);

  const streaming = phase === "streaming";

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-5 pb-10 sm:px-8">
      <header className="flex items-center justify-between border-b border-line py-5">
        <div className="flex items-baseline gap-3">
          <span
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-ui-display)" }}
          >
            Briefboard
          </span>
          <span className="hidden text-sm text-dim sm:inline">
            brand systems, streamed live
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {mode && (
            <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 uppercase tracking-widest text-dim">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streaming ? "pulse-dot" : ""
                } ${mode === "live" ? "bg-signal" : "bg-dim"}`}
              />
              {mode}
            </span>
          )}
          <span className="hidden font-mono text-faint md:inline">
            {received > 0 ? `${received.toLocaleString()} chars streamed` : "idle"}
          </span>
        </div>
      </header>

      <div className="mt-8 grid flex-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <div>
            <h1
              className="text-2xl leading-snug font-medium tracking-tight"
              style={{ fontFamily: "var(--font-ui-display)" }}
            >
              Paste a brief.
              <br />
              <span className="text-signal">Watch the identity assemble.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-dim">
              A structured brand system is generated token by token and rendered
              the moment each field arrives — palette, typography, voice and a
              live hero mock, all from one streaming response.
            </p>
          </div>

          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value.slice(0, MAX_BRIEF_LENGTH))}
            rows={7}
            spellCheck={false}
            placeholder="Describe the brand: who it's for, how it should feel, what it must never be…"
            className="w-full resize-none rounded-xl border border-line bg-panel p-4 text-sm leading-relaxed text-bone placeholder:text-faint focus:border-line-strong focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {SAMPLE_BRIEFS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setBrief(s.brief)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  brief === s.brief
                    ? "border-signal text-bone"
                    : "border-line text-dim hover:border-line-strong hover:text-bone"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={streaming || brief.trim().length === 0}
            className="group flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontFamily: "var(--font-ui-display)" }}
          >
            {streaming ? "Streaming…" : board ? "Generate again" : "Generate the board"}
          </button>

          {error && (
            <p className="rounded-lg border border-signal/40 bg-signal/10 px-3 py-2 text-xs text-bone">
              {error}
            </p>
          )}

          {mode === "replay" && (
            <p className="text-xs leading-relaxed text-faint">
              Replay mode: no API key is configured, so you&apos;re watching a
              recorded generation streamed through the identical code path as a
              live call.
            </p>
          )}

          <footer className="mt-auto hidden border-t border-line pt-4 text-xs leading-relaxed text-faint lg:block">
            Built by Aleksander Pekaj · Next.js App Router · TypeScript · Vercel
            Edge streaming · Anthropic API · hand-rolled partial-JSON parser
          </footer>
        </aside>

        <main className="min-w-0">
          <Board board={board} phase={phase} />
        </main>
      </div>

      <footer className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-faint lg:hidden">
        Built by Aleksander Pekaj · Next.js App Router · TypeScript · Vercel Edge
        streaming · Anthropic API · hand-rolled partial-JSON parser
      </footer>
    </div>
  );
}

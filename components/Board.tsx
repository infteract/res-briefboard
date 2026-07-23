"use client";

import { normalizeHex, readableOn } from "@/lib/color";
import { TYPE_PAIRS } from "@/lib/fonts";
import type { PartialBoard, PaletteRole, TypePairId } from "@/lib/schema";

interface BoardProps {
  board: PartialBoard | null;
  phase: "idle" | "streaming" | "done" | "error";
}

const ROLE_FALLBACKS: Record<PaletteRole, string> = {
  background: "#101114",
  surface: "#181A20",
  primary: "#FF4D00",
  accent: "#8A8F98",
  text: "#F5F4F0",
};

function roleHex(board: PartialBoard, role: PaletteRole): string {
  const found = board.palette?.find((c) => c?.role === role)?.hex;
  return normalizeHex(found, ROLE_FALLBACKS[role]);
}

export default function Board({ board, phase }: BoardProps) {
  if (!board) {
    return phase === "streaming" ? <BoardSkeleton /> : <EmptyState />;
  }

  const pair =
    board.type_pair && board.type_pair in TYPE_PAIRS
      ? TYPE_PAIRS[board.type_pair as TypePairId]
      : null;
  const displayFont = pair?.display ?? "var(--font-ui-display)";
  const bodyFont = pair?.body ?? "var(--font-ui-body)";
  const streaming = phase === "streaming";

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      {(board.brand_name || board.tagline) && (
        <section className="reveal rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <SectionLabel>Identity</SectionLabel>
          {board.brand_name && (
            <h2
              className="mt-2 text-4xl tracking-tight sm:text-6xl"
              style={{ fontFamily: displayFont }}
            >
              {board.brand_name}
            </h2>
          )}
          {board.tagline && (
            <p className="mt-3 text-lg text-dim" style={{ fontFamily: bodyFont }}>
              {board.tagline}
              {streaming && !board.tone_words && <Caret />}
            </p>
          )}
        </section>
      )}

      {/* Tone */}
      {board.tone_words && board.tone_words.length > 0 && (
        <section className="reveal rounded-2xl border border-line bg-panel p-6">
          <SectionLabel>Tone</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {board.tone_words.map(
              (w, i) =>
                w && (
                  <span
                    key={i}
                    className="reveal rounded-full border border-line-strong px-4 py-1.5 text-sm"
                    style={{ fontFamily: bodyFont }}
                  >
                    {w}
                  </span>
                ),
            )}
          </div>
        </section>
      )}

      {/* Palette */}
      {board.palette && board.palette.length > 0 && (
        <section className="reveal rounded-2xl border border-line bg-panel p-6">
          <SectionLabel>Palette</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {board.palette.map((c, i) => {
              if (!c?.hex) return null;
              const hex = normalizeHex(c.hex, "#333333");
              const fg = readableOn(hex);
              return (
                <div
                  key={i}
                  className="reveal flex aspect-[4/5] flex-col justify-between rounded-xl p-3"
                  style={{ background: hex, color: fg }}
                >
                  <span className="text-[10px] uppercase tracking-widest opacity-70">
                    {c.role ?? ""}
                  </span>
                  <div>
                    <div className="text-sm leading-tight font-medium">
                      {c.name ?? ""}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] uppercase opacity-70">
                      {hex}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Typography */}
      {pair && (
        <section className="reveal rounded-2xl border border-line bg-panel p-6">
          <SectionLabel>Typography</SectionLabel>
          <div className="mt-3 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div
              className="text-7xl leading-none sm:text-8xl"
              style={{ fontFamily: pair.display }}
            >
              Aa
            </div>
            <div>
              <div className="text-lg" style={{ fontFamily: pair.display }}>
                {pair.label}
              </div>
              <div
                className="mt-1 truncate text-sm text-dim"
                style={{ fontFamily: pair.body }}
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
              </div>
              {board.type_rationale && (
                <p
                  className="mt-3 max-w-xl text-sm leading-relaxed text-dim"
                  style={{ fontFamily: pair.body }}
                >
                  {board.type_rationale}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Voice */}
      {board.voice && (board.voice.do?.length || board.voice.dont?.length) ? (
        <section className="reveal rounded-2xl border border-line bg-panel p-6">
          <SectionLabel>Voice</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <ul className="space-y-2">
              {board.voice.do?.map(
                (v, i) =>
                  v && (
                    <li key={i} className="reveal flex gap-2 text-sm leading-relaxed">
                      <span className="mt-px font-mono text-signal">+</span>
                      <span style={{ fontFamily: bodyFont }}>{v}</span>
                    </li>
                  ),
              )}
            </ul>
            <ul className="space-y-2">
              {board.voice.dont?.map(
                (v, i) =>
                  v && (
                    <li key={i} className="reveal flex gap-2 text-sm leading-relaxed text-dim">
                      <span className="mt-px font-mono">–</span>
                      <span style={{ fontFamily: bodyFont }}>{v}</span>
                    </li>
                  ),
              )}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Hero mock — the streamed system, applied */}
      {board.hero?.headline && (
        <section className="reveal overflow-hidden rounded-2xl border border-line">
          <div className="border-b border-line bg-panel px-6 py-3">
            <SectionLabel>In situ — hero, set in the system above</SectionLabel>
          </div>
          <div
            className="px-6 py-14 sm:px-12 sm:py-20"
            style={{ background: roleHex(board, "background") }}
          >
            <div className="mx-auto max-w-2xl text-center">
              <span
                className="text-[11px] uppercase tracking-[0.25em]"
                style={{
                  color: roleHex(board, "accent"),
                  fontFamily: bodyFont,
                }}
              >
                {board.brand_name ?? ""}
              </span>
              <h3
                className="mt-4 text-3xl leading-tight sm:text-5xl"
                style={{
                  color: roleHex(board, "text"),
                  fontFamily: displayFont,
                }}
              >
                {board.hero.headline}
              </h3>
              {board.hero.subheadline && (
                <p
                  className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base"
                  style={{
                    color: roleHex(board, "text"),
                    opacity: 0.72,
                    fontFamily: bodyFont,
                  }}
                >
                  {board.hero.subheadline}
                </p>
              )}
              {board.hero.cta && (
                <span
                  className="mt-7 inline-block rounded-lg px-6 py-3 text-sm font-semibold"
                  style={{
                    background: roleHex(board, "primary"),
                    color: readableOn(roleHex(board, "primary")),
                    fontFamily: displayFont,
                  }}
                >
                  {board.hero.cta}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Imagery */}
      {board.imagery?.direction && (
        <section className="reveal rounded-2xl border border-line bg-panel p-6">
          <SectionLabel>Imagery</SectionLabel>
          <p
            className="mt-3 max-w-2xl text-sm leading-relaxed text-dim"
            style={{ fontFamily: bodyFont }}
          >
            {board.imagery.direction}
          </p>
          {board.imagery.keywords && board.imagery.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {board.imagery.keywords.map(
                (k, i) =>
                  k && (
                    <span
                      key={i}
                      className="reveal rounded-md bg-panel-2 px-3 py-1.5 font-mono text-xs text-dim"
                    >
                      {k}
                    </span>
                  ),
              )}
            </div>
          )}
        </section>
      )}

      {streaming && <NextSectionSkeleton />}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
      {children}
    </span>
  );
}

function Caret() {
  return (
    <span className="pulse-dot ml-1 inline-block h-4 w-[2px] translate-y-0.5 bg-signal align-baseline" />
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-line text-center">
      <div
        className="text-5xl text-faint"
        style={{ fontFamily: "var(--font-fraunces)" }}
      >
        Aa
      </div>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-faint">
        The board is empty. Write a brief — or pick a sample — and generate.
      </p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="shimmer h-40 rounded-2xl border border-line" />
      <div className="shimmer h-20 rounded-2xl border border-line" />
      <div className="shimmer h-48 rounded-2xl border border-line" />
    </div>
  );
}

function NextSectionSkeleton() {
  return <div className="shimmer h-24 rounded-2xl border border-line" />;
}

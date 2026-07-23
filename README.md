# Briefboard

**Paste a creative brief. Watch a complete brand identity assemble itself in real time.**

Briefboard streams a structured brand system — palette, typography, tone, voice,
imagery direction and a live hero mock — from an LLM as a single JSON response,
and renders each field the moment its tokens arrive. No chat box, no spinner:
the interface *is* the stream.

Built as a work sample for a Fullstack Product Engineer role: Next.js App
Router, TypeScript end to end, Vercel Edge streaming, and an eye kept firmly on
the pixels.

## Run it

```bash
npm install
npm run dev
```

Without an `ANTHROPIC_API_KEY`, the app runs in **replay mode** — a recorded
generation is streamed through the exact same route, transport and client
parser as a live call, so the full experience works at zero cost. Add a key in
`.env.local` (see `.env.example`) for live generations.

## Deploy

```bash
vercel
```

Set `ANTHROPIC_API_KEY` in the Vercel project settings for live mode; leave it
unset to ship the free replay demo. The generate route runs on the Edge runtime.

## What to look at

- `app/api/generate/route.ts` — Edge route that streams structured output
  (JSON schema enforced) from the Anthropic API, with a replay fallback that
  reuses the identical code path.
- `lib/partial-json.ts` — a hand-rolled tolerant parser that turns a *prefix*
  of a JSON document into the largest well-formed value it contains. This is
  what lets half-streamed headlines render as live typewriter text while
  half-streamed keys stay invisible.
- `components/Board.tsx` — renders a deeply-partial, progressively-arriving
  object without flicker, including a hero section typeset live in the
  generated brand's own palette and fonts.
- `ARCHITECTURE.md` — the reasoning behind each of these decisions.

## Honest colophon

Initial build was a one-day timeboxed sprint using AI-assisted tooling (Claude
Code), with every architectural decision, review pass and the streaming parser
verified by hand — the same workflow described in my application.

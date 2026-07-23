# Architecture notes

Six decisions worth explaining, roughly in the order a request flows.

## 1. Edge runtime for the generation route

`app/api/generate/route.ts` declares `runtime = "edge"`. Streaming LLM output
is the worst case for classic serverless: the function must live for the whole
generation (10–30s), most of which is I/O wait. The Edge runtime fits because
it bills and scales around streaming responses, cold-starts in tens of
milliseconds (no Node process to boot), and hands back a web-standard
`ReadableStream` that Next.js passes through untouched.

That constraint bit at deploy time: the official Anthropic SDK's entry point
pulls `node:fs`/`node:path` into the bundle, which the Edge runtime rejects.
Rather than retreat to the Node runtime, the route speaks the provider wire
formats directly — one `fetch` call and a ~30-line SSE line parser. Fewer
moving parts in the bundle, one dependency removed, and "designing around
serverless constraints" made concrete rather than claimed.

Speaking the wire format also made a second provider nearly free: the route
supports direct Anthropic (schema-enforced structured output) or any
OpenAI-compatible gateway such as OpenRouter (JSON contract enforced by
prompt, with fence-stripping as a guard), selected by whichever key is
configured. Same forwarder, different delta extractor.

## 2. One streaming wire format: raw JSON text

The route forwards the model's text deltas verbatim — no SSE envelope, no
JSON-lines framing, no per-chunk metadata. The response *is* the JSON document,
arriving gradually. This keeps the transport boring on purpose: the interesting
problem (rendering a half-arrived object) lives in exactly one place, the
client parser, rather than being smeared across a custom protocol. Mode is
communicated out-of-band in a response header.

## 3. A hand-rolled partial-JSON parser instead of an SDK helper

Vercel's AI SDK ships `streamObject`/`useObject`, which solve this problem
off the shelf, and in a product codebase I'd weigh them seriously. I hand-rolled
`lib/partial-json.ts` (~120 lines) here for two reasons. First, it's the load-
bearing skill this demo exists to show — streaming structured output into a
visual UI — and I wanted the mechanics on the table, not behind an import.
Second, it buys precise control over *what renders mid-stream*: a half-streamed
string **value** is closed and kept (headlines type themselves out), while a
half-streamed **key** is cut back to the last complete entry (the UI never
shows a dangling label with no content). That asymmetry is a product decision,
and owning the parser makes it one line of code.

The parser is a single scan with a context-stack state machine — no
regex-and-retry loops — so it's O(n) per parse and safe to run on every chunk.

## 4. Schema property order as choreography

Structured outputs (JSON schema enforcement, server-side) guarantee the
document's *shape*; the schema's property order determines the *reveal
sequence*. Identity → tone → palette → typography → voice → hero → imagery is
deliberately cinematic: cheap-to-generate fields land in the first second, and
the hero mock — which needs palette + fonts + copy — lands last, as the payoff.
The client renders whatever subset exists, so ordering lives entirely in the
schema and prompt, not in UI logic.

## 5. Fonts as a curated enum, not free choice

The model picks typography from four preloaded `next/font` pairings rather than
naming arbitrary fonts. Free-form font choice would mean runtime font loading
of untrusted names — FOUT, layout shift, a network waterfall mid-animation, and
a failure mode when the model invents a font. An enum in the schema makes the
choice validatable, and preloading makes it land instantly. Constraining the
model's output space to what the product can render *well* beats maximising
its freedom.

## 6. Replay mode shares the live code path

With no API key, the route streams a recorded generation with token-ish pacing
through the same response shape, and the client can't tell the difference —
same transport, same parser, same rendering. This exists for cost and abuse
reasons (a public demo with an open LLM endpoint is a free-tokens piñata), but
the design rule is the point: the fallback exercises the real pipeline, so the
demo degrades in cost, not in honesty. Model output is also treated as
untrusted styling input — hex values are validated/normalised before touching
CSS, briefs are length-capped, and text renders as text, never markup.

## What I'd do next with more than a day

Per-IP rate limiting on the live route (KV-backed token bucket), resumable
generations keyed by brief hash, streaming the board into a shareable URL
(server-rendered OG image of the finished board), and a second board layout so
the model can also choose composition — same enum pattern as the fonts.

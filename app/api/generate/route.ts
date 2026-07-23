import { BRAND_BOARD_JSON_SCHEMA, MAX_BRIEF_LENGTH } from "@/lib/schema";
import { REPLAY_JSON } from "@/lib/replay";

// Edge runtime: streams begin in tens of milliseconds with no cold Node
// process, and the function stays alive for the life of the stream rather
// than a fixed invocation window.
export const runtime = "edge";

// The JSON contract lives in the prompt as well as (on the Anthropic path)
// the schema, because the OpenRouter path has no server-side enforcement.
const SYSTEM = `You are a senior brand designer producing a compact brand identity board from a creative brief.

Respond with a single raw JSON object and nothing else: no markdown fences, no commentary. Generate keys in exactly this order:
{"brand_name", "tagline", "tone_words", "palette", "type_pair", "type_rationale", "voice": {"do", "dont"}, "hero": {"headline", "subheadline", "cta"}, "imagery": {"direction", "keywords"}}

Rules:
- Ground every choice in the brief. No generic startup styling.
- tone_words: exactly 5 single words.
- palette: exactly 5 objects {"name", "hex", "role"}, one per role (background, surface, primary, accent, text). The text colour must be clearly readable on the background colour. Name colours like a designer, not a paint catalog.
- type_pair: one of "fraunces-archivo" (warm, editorial), "playfair-sourcesans" (classic, refined), "spacegrotesk-plex" (technical, contemporary), "dmserif-worksans" (confident, direct). Pick what the brief calls for.
- voice: exactly 3 "do" and 3 "dont" entries, each a short imperative sentence.
- hero: headline under 8 words, subheadline one sentence, cta 1-3 words.
- imagery: "direction" one or two sentences, "keywords" exactly 6 short phrases.`;

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let brief = "";
  try {
    const body = (await req.json()) as { brief?: unknown };
    brief = String(body.brief ?? "").trim();
  } catch {
    return jsonError("Body must be JSON with a `brief` string.", 400);
  }
  if (!brief) return jsonError("Give me a brief first.", 400);
  if (brief.length > MAX_BRIEF_LENGTH) {
    return jsonError(`Brief too long (max ${MAX_BRIEF_LENGTH} characters).`, 400);
  }

  // Provider selection: direct Anthropic if configured, else OpenRouter,
  // else the recorded replay. Any live failure degrades to replay so the
  // demo never dead-ends.
  try {
    if (process.env.ANTHROPIC_API_KEY) return await anthropicLive(brief);
    if (process.env.OPENROUTER_API_KEY) return await openrouterLive(brief);
  } catch {
    return replayResponse();
  }
  return replayResponse();
}

interface SseEvent {
  type?: string;
  delta?: { type?: string; text?: string };
  choices?: { delta?: { content?: string } }[];
}

// Direct Messages API. (The official SDK drags node:fs into the Edge bundle,
// so both providers are spoken to at the wire level.)
async function anthropicLive(brief: string): Promise<Response> {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.BRAND_MODEL ?? "claude-opus-4-8",
      max_tokens: 4096,
      stream: true,
      system: SYSTEM,
      messages: [{ role: "user", content: brief }],
      output_config: {
        format: { type: "json_schema", schema: BRAND_BOARD_JSON_SCHEMA },
      },
    }),
  });
  if (!upstream.ok || !upstream.body) return replayResponse();

  return forwardSse(upstream.body, (e) =>
    e.type === "content_block_delta" && e.delta?.type === "text_delta"
      ? e.delta.text
      : undefined,
  );
}

// OpenAI-compatible chat completions via OpenRouter.
async function openrouterLive(brief: string): Promise<Response> {
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://briefboard-ap.vercel.app",
      "X-Title": "Briefboard",
    },
    body: JSON.stringify({
      model: process.env.BRAND_MODEL ?? "anthropic/claude-opus-4.8",
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: brief },
      ],
    }),
  });
  if (!upstream.ok || !upstream.body) return replayResponse();

  // No schema enforcement on this path, so strip any markdown fence the
  // model emits despite instructions. Backticks never occur in valid board
  // JSON, and the client parser ignores text outside the outermost braces.
  return forwardSse(upstream.body, (e) =>
    e.choices?.[0]?.delta?.content?.replaceAll("`", ""),
  );
}

function forwardSse(
  source: ReadableStream<Uint8Array>,
  extract: (event: SseEvent) => string | undefined,
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = source.getReader();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const text = extract(JSON.parse(payload) as SseEvent);
              if (typeof text === "string" && text.length > 0) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // keepalives / partial frames — ignore
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });

  return streamResponse(body, "live");
}

function replayResponse(): Response {
  const encoder = new TextEncoder();
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Deterministic pseudo-random pacing so the replay feels like tokens
      // arriving, not a file download.
      let seed = 42;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };

      let i = 0;
      while (i < REPLAY_JSON.length && !cancelled) {
        const size = 2 + Math.floor(rand() * 10);
        controller.enqueue(encoder.encode(REPLAY_JSON.slice(i, i + size)));
        i += size;
        await new Promise((r) => setTimeout(r, 10 + Math.floor(rand() * 22)));
      }
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return streamResponse(body, "replay");
}

function streamResponse(body: ReadableStream<Uint8Array>, mode: "live" | "replay"): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Briefboard-Mode": mode,
    },
  });
}

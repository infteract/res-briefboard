import Anthropic from "@anthropic-ai/sdk";
import { BRAND_BOARD_JSON_SCHEMA, MAX_BRIEF_LENGTH } from "@/lib/schema";
import { REPLAY_JSON } from "@/lib/replay";

// Edge runtime: streams begin in tens of milliseconds with no cold Node
// process, and the function stays alive for the life of the stream rather
// than a fixed invocation window.
export const runtime = "edge";

const SYSTEM = `You are a senior brand designer producing a compact brand identity board from a creative brief.

Rules:
- Ground every choice in the brief. No generic startup styling.
- tone_words: exactly 5 single words.
- palette: exactly 5 colors, one per role (background, surface, primary, accent, text).
  The text color must be clearly readable on the background color. Name colors like a designer, not a paint catalog.
- type_pair options: "fraunces-archivo" (warm, editorial), "playfair-sourcesans" (classic, refined), "spacegrotesk-plex" (technical, contemporary), "dmserif-worksans" (confident, direct). Pick the one the brief actually calls for.
- voice: exactly 3 "do" and 3 "dont" entries, each a short imperative sentence.
- hero: headline under 8 words, subheadline one sentence, cta 1-3 words.
- imagery.keywords: exactly 6 short phrases.
- Generate fields in the schema's property order.`;

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

  if (!process.env.ANTHROPIC_API_KEY) return replayResponse();

  try {
    return liveResponse(brief);
  } catch {
    // A failure to even open the stream (bad key, network) degrades to
    // replay so the demo never dead-ends.
    return replayResponse();
  }
}

function liveResponse(brief: string): Response {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.BRAND_MODEL ?? "claude-opus-4-8",
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: brief }],
    output_config: {
      format: { type: "json_schema", schema: BRAND_BOARD_JSON_SCHEMA },
    },
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
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

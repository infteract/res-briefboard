/**
 * Tolerant parser for a *prefix* of a JSON document, built for LLM streaming:
 * given the first N characters of a JSON object mid-generation, return the
 * largest well-formed value contained in it.
 *
 * Strategy: single scan with a context stack, tracking exactly where the text
 * stops mid-construct, then repair the tail:
 *  - a half-streamed string VALUE is kept and closed (this is what makes
 *    headlines render with a live typewriter effect),
 *  - a dangling KEY (no value yet) is cut back to the previous complete entry,
 *  - incomplete literals (`tru`, `-`, `1.`) are cut back,
 *  - every open object/array is closed.
 */

type Frame =
  | { kind: "object"; phase: "expect-key" | "in-key" | "after-key" | "expect-value" | "after-value"; entryStart: number }
  | { kind: "array"; phase: "expect-value" | "after-value"; entryStart: number };

export function parsePartialJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return undefined;
  const src = text.slice(start);

  try {
    return JSON.parse(src);
  } catch {
    // fall through to repair
  }

  const repaired = repair(src);
  if (repaired === undefined) return undefined;
  try {
    return JSON.parse(repaired);
  } catch {
    return undefined;
  }
}

function repair(src: string): string | undefined {
  const stack: Frame[] = [];
  let inString = false;
  let escape = false;
  let stringIsKey = false;
  let literalStart = -1; // start of an in-progress number/true/false/null
  let i = 0;

  const top = () => stack[stack.length - 1];

  for (; i < src.length; i++) {
    const c = src[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
        const t = top();
        if (t) {
          if (t.kind === "object" && t.phase === "in-key") t.phase = "after-key";
          else t.phase = "after-value";
        }
      }
      continue;
    }

    if (literalStart !== -1) {
      if (/[0-9eE+\-.a-z]/.test(c)) continue;
      literalStart = -1;
      const t = top();
      if (t) t.phase = "after-value";
      // reprocess this char as structural
    }

    if (c === '"') {
      inString = true;
      escape = false;
      const t = top();
      if (t && t.kind === "object" && (t.phase === "expect-key" || t.phase === "after-value" || t.phase === "expect-value")) {
        if (t.phase === "expect-key") {
          t.entryStart = i;
          t.phase = "in-key";
          stringIsKey = true;
          continue;
        }
      }
      stringIsKey = false;
      if (t && t.kind === "object" && t.phase === "expect-value") t.phase = "expect-value";
      continue;
    }

    if (c === "{") {
      stack.push({ kind: "object", phase: "expect-key", entryStart: i });
      continue;
    }
    if (c === "[") {
      stack.push({ kind: "array", phase: "expect-value", entryStart: i });
      continue;
    }
    if (c === "}" || c === "]") {
      stack.pop();
      const t = top();
      if (t) t.phase = "after-value";
      continue;
    }
    if (c === ":") {
      const t = top();
      if (t && t.kind === "object") t.phase = "expect-value";
      continue;
    }
    if (c === ",") {
      const t = top();
      if (t) {
        t.phase = t.kind === "object" ? "expect-key" : "expect-value";
        t.entryStart = i;
      }
      continue;
    }
    if (/\s/.test(c)) continue;

    // start of a bare literal (number, true, false, null)
    literalStart = i;
  }

  if (stack.length === 0 && !inString) return undefined;

  let out = src;

  if (inString) {
    if (escape) out = out.slice(0, -1); // drop dangling backslash
    const t = top();
    if (t && t.kind === "object" && stringIsKey) {
      // half-streamed key — cut the whole entry
      out = out.slice(0, t.entryStart);
      t.phase = "expect-key";
    } else {
      out += '"'; // half-streamed value string — close it and keep the text
      if (t) t.phase = "after-value";
    }
  } else if (literalStart !== -1) {
    const literal = out.slice(literalStart);
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(literal)) {
      const t = top();
      if (t) t.phase = "after-value";
    } else {
      out = out.slice(0, literalStart); // `tru`, `1.`, `-` etc — cut it
    }
  }

  // a key with no value yet (`"name"` / `"name":`) — cut back to entry start
  const t2 = top();
  if (t2 && t2.kind === "object" && (t2.phase === "after-key" || t2.phase === "expect-value" || t2.phase === "in-key")) {
    out = out.slice(0, t2.entryStart);
  }

  out = out.replace(/,\s*$/, "");

  for (let s = stack.length - 1; s >= 0; s--) {
    out += stack[s].kind === "object" ? "}" : "]";
  }
  return out;
}

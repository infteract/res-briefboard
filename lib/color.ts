const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Model output is untrusted styling input — normalise before it touches CSS.
export function normalizeHex(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const m = HEX_RE.exec(raw.trim());
  if (!m) return fallback;
  const h = m[1];
  return "#" + (h.length === 3 ? h.split("").map((c) => c + c).join("") : h);
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(normalizeHex(hex, "#000000").slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

// Pick a legible foreground for text sitting on `hex`.
export function readableOn(hex: string): string {
  return relativeLuminance(hex) > 0.35 ? "#101114" : "#F5F4F0";
}

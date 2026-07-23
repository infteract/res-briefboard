export type PaletteRole = "background" | "surface" | "primary" | "accent" | "text";

export type TypePairId =
  | "fraunces-archivo"
  | "playfair-sourcesans"
  | "spacegrotesk-plex"
  | "dmserif-worksans";

export interface PaletteColor {
  name: string;
  hex: string;
  role: PaletteRole;
}

export interface BrandBoard {
  brand_name: string;
  tagline: string;
  tone_words: string[];
  palette: PaletteColor[];
  type_pair: TypePairId;
  type_rationale: string;
  voice: { do: string[]; dont: string[] };
  hero: { headline: string; subheadline: string; cta: string };
  imagery: { direction: string; keywords: string[] };
}

// What the client holds mid-stream: any node may be absent or half-arrived.
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PartialBoard = DeepPartial<BrandBoard>;

export const TYPE_PAIR_IDS: TypePairId[] = [
  "fraunces-archivo",
  "playfair-sourcesans",
  "spacegrotesk-plex",
  "dmserif-worksans",
];

// Property order here is deliberate: the model streams fields top-to-bottom,
// so this is also the order sections materialise on the board.
export const BRAND_BOARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    brand_name: { type: "string" },
    tagline: { type: "string" },
    tone_words: { type: "array", items: { type: "string" } },
    palette: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          hex: { type: "string" },
          role: {
            type: "string",
            enum: ["background", "surface", "primary", "accent", "text"],
          },
        },
        required: ["name", "hex", "role"],
        additionalProperties: false,
      },
    },
    type_pair: { type: "string", enum: TYPE_PAIR_IDS },
    type_rationale: { type: "string" },
    voice: {
      type: "object",
      properties: {
        do: { type: "array", items: { type: "string" } },
        dont: { type: "array", items: { type: "string" } },
      },
      required: ["do", "dont"],
      additionalProperties: false,
    },
    hero: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        cta: { type: "string" },
      },
      required: ["headline", "subheadline", "cta"],
      additionalProperties: false,
    },
    imagery: {
      type: "object",
      properties: {
        direction: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
      required: ["direction", "keywords"],
      additionalProperties: false,
    },
  },
  required: [
    "brand_name",
    "tagline",
    "tone_words",
    "palette",
    "type_pair",
    "type_rationale",
    "voice",
    "hero",
    "imagery",
  ],
  additionalProperties: false,
} as const;

export const SAMPLE_BRIEFS: { label: string; brief: string }[] = [
  {
    label: "AI canvas for creatives",
    brief:
      "A real-time, highly visual AI workspace where designers, filmmakers and artists direct generative models on an infinite canvas — with their hands, not just prompts. Sydney-born, speed-obsessed, zero bureaucracy. Feels like a professional instrument, not a toy.",
  },
  {
    label: "Analog film lab",
    brief:
      "A boutique analog film lab in Marrickville that develops, scans and prints for photographers who shoot film on purpose. Patient, tactile, a little nostalgic but never twee. The counter staff know your name and your stock.",
  },
  {
    label: "Electronic music label",
    brief:
      "An independent electronic music label releasing club records and late-night ambient on vinyl and streaming. Raw, nocturnal, community-first. The kind of label whose slipmats end up in every DJ booth in the city.",
  },
];

export const MAX_BRIEF_LENGTH = 2000;

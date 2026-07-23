import type { BrandBoard } from "./schema";

// A recorded generation for the first sample brief. Replay mode streams this
// through the exact same route, transport and client parser as a live call —
// only the token source differs — so the demo works with no API key at all.
export const REPLAY_BOARD: BrandBoard = {
  brand_name: "Meridian",
  tagline: "Direct the model. In real time.",
  tone_words: ["kinetic", "precise", "luminous", "confident", "unhurried"],
  palette: [
    { name: "Studio Black", hex: "#0A0C10", role: "background" },
    { name: "Charcoal", hex: "#151A21", role: "surface" },
    { name: "Signal", hex: "#D6FF4B", role: "primary" },
    { name: "Flare", hex: "#FF7A59", role: "accent" },
    { name: "Bone", hex: "#F2F1EC", role: "text" },
  ],
  type_pair: "spacegrotesk-plex",
  type_rationale:
    "Space Grotesk's engineered curves read like an instrument panel — technical without being cold — while IBM Plex Sans keeps long-form UI copy calm and legible at speed.",
  voice: {
    do: [
      "Speak to professionals, in the language of craft",
      "Describe what the tool does in physical verbs — pull, sketch, steer",
      "Let performance claims be specific and measurable",
    ],
    dont: [
      "Call anything magic",
      "Talk about prompts when you can talk about hands",
      "Over-promise autonomy — the artist stays in charge",
    ],
  },
  hero: {
    headline: "The canvas keeps up with you now.",
    subheadline:
      "Meridian is a real-time studio where designers, filmmakers and artists steer generative AI with their hands — every stroke rendered as fast as you think it.",
    cta: "Start creating",
  },
  imagery: {
    direction:
      "Long-exposure light trails over dark studio spaces; hands mid-gesture on tablets and consoles; motion blur used deliberately, never as decoration. Photography over illustration.",
    keywords: ["light trails", "hands at work", "dark studio", "motion blur", "close crop", "signal green"],
  },
};

export const REPLAY_JSON = JSON.stringify(REPLAY_BOARD);

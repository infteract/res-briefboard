import {
  Archivo,
  DM_Serif_Display,
  Fraunces,
  IBM_Plex_Sans,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import type { TypePairId } from "./schema";

export const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
export const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
export const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });
export const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
export const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});
export const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });

export const fontVariableClasses = [
  fraunces.variable,
  archivo.variable,
  playfair.variable,
  sourceSans.variable,
  spaceGrotesk.variable,
  plexSans.variable,
  dmSerif.variable,
  workSans.variable,
].join(" ");

export interface TypePair {
  label: string;
  display: string;
  body: string;
  vibe: string;
}

// The model chooses one of these ids; every font is preloaded via next/font,
// so a streamed choice renders instantly with no layout shift or FOUT.
export const TYPE_PAIRS: Record<TypePairId, TypePair> = {
  "fraunces-archivo": {
    label: "Fraunces + Archivo",
    display: "var(--font-fraunces)",
    body: "var(--font-archivo)",
    vibe: "warm, editorial, a little wonky",
  },
  "playfair-sourcesans": {
    label: "Playfair Display + Source Sans 3",
    display: "var(--font-playfair)",
    body: "var(--font-source-sans)",
    vibe: "classic, refined, high-contrast",
  },
  "spacegrotesk-plex": {
    label: "Space Grotesk + IBM Plex Sans",
    display: "var(--font-space-grotesk)",
    body: "var(--font-plex-sans)",
    vibe: "technical, kinetic, contemporary",
  },
  "dmserif-worksans": {
    label: "DM Serif Display + Work Sans",
    display: "var(--font-dm-serif)",
    body: "var(--font-work-sans)",
    vibe: "confident, direct, unfussy",
  },
};

import type { Metadata } from "next";
import "./globals.css";
import { fontVariableClasses } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Briefboard — brand systems, streamed live",
  description:
    "Paste a creative brief and watch a complete brand identity assemble itself in real time, rendered from a streaming structured LLM response on the edge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariableClasses}>
      <body className="bg-ink text-bone antialiased">{children}</body>
    </html>
  );
}

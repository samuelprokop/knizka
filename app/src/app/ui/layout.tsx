import type { Metadata } from "next";
import { Bitter, Inter } from "next/font/google";

import "../globals.css";

/* Katalóg obrazoviek (náhľad UI) – vlastný koreňový layout mimo trhu a administrácie. */

const heading = Bitter({ variable: "--font-heading", subsets: ["latin", "latin-ext"], weight: ["700", "800"] });
const body = Inter({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Katalóg obrazoviek – náhľad UI",
  robots: { index: false, follow: false },
};

export default function UiLayout({ children }: LayoutProps<"/ui">) {
  return (
    <html lang="sk" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-body text-ink">{children}</body>
    </html>
  );
}

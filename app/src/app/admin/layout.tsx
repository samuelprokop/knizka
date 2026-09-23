import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../globals.css";

/*
  Administrácia má vlastný koreňový layout mimo trhu (CLAUDE.md, proxy.ts ju
  vynecháva). Prihlásenie/rola sa overuje v app/admin/(protected)/layout.tsx,
  aby prihlasovacia stránka nebola v tej istej vetve stromu.
*/

const body = Inter({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Administrácia – TAKTIK",
  description: "Interná administrácia štúdia personalizovaných kníh.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="sk" className={`${body.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-body text-ink">{children}</body>
    </html>
  );
}

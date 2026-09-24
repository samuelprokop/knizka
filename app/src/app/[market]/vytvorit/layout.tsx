import type { Metadata } from "next";
import type { ReactNode } from "react";

// Súkromné / transakčné stránky nepatria do vyhľadávačov.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NoIndexLayout({ children }: { children: ReactNode }) {
  return children;
}

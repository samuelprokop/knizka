"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Kým na pozadí beží generovanie, obnovuje údaje stránky (portréty, Karta,
 * strany knihy). Keď balík B dodá frontu s udalosťami, nahradí sa to
 * serverovými udalosťami.
 */
export function AutoRefresh({ active, intervalMs = 1500 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const handle = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(handle);
  }, [active, intervalMs, router]);
  return null;
}

import type { MetadataRoute } from "next";

import { MARKET_CODES } from "@/config/markets";
import { siteUrl } from "@/lib/site-url";

/** Verejné stránky trhov (úvod, časté otázky, obchodné podmienky) s prepojením jazykových verzií (hreflang). */
const PAGES = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/otazky", changeFrequency: "monthly", priority: 0.7 },
  { path: "/obchodne-podmienky", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.flatMap((page) => {
    const languages = { "sk-SK": `${base}/sk${page.path}`, "cs-CZ": `${base}/cz${page.path}` };
    return MARKET_CODES.map((code) => ({
      url: `${base}/${code}${page.path}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages },
    }));
  });
}

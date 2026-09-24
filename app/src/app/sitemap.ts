import type { MetadataRoute } from "next";

import { MARKET_CODES } from "@/config/markets";
import { siteUrl } from "@/lib/site-url";

/** Úvodné stránky trhov s prepojením jazykových verzií (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = { "sk-SK": `${base}/sk`, "cs-CZ": `${base}/cz` };
  return MARKET_CODES.map((code) => ({
    url: `${base}/${code}`,
    changeFrequency: "weekly",
    priority: 1,
    alternates: { languages },
  }));
}

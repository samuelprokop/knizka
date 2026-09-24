import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

/** Do vyhľadávačov len verejné stránky; konfigurátor, košík, objednávky a administrácia nie. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/ui", "/*/kniha/", "/*/vytvorit", "/*/kosik", "/*/objednavka", "/*/moja-kniha/", "/*/nahlad"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

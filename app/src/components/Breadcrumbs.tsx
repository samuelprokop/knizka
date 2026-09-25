import Link from "next/link";

import { siteUrl } from "@/lib/site-url";
import { ChevronRightIcon, HomeIcon } from "./icons";

/*
  Navigačná cesta obsahových stránok (Úvod › Časté otázky): viditeľná cesta späť na
  úvodnú stránku aj štruktúrované dáta BreadcrumbList pre vyhľadávače.
*/
export function Breadcrumbs({ label, items }: { label: string; items: { name: string; href: string }[] }) {
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${base}${item.href}` })),
  };
  return (
    <nav aria-label={label}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRightIcon className="size-4 text-ink/35" />}
              {last ? (
                <span aria-current="page" className="px-1 font-medium text-ink/60">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ink/75 outline-none hover:text-ink hover:underline underline-offset-4 focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                  {i === 0 && <HomeIcon className="size-4" />}
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

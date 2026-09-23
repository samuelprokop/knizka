import Image from "next/image";
import Link from "next/link";

import { BookHero } from "@/components/BookHero";
import { LANDING_COPY } from "@/content/landing";
import { getMarketContext } from "@/i18n/server";

export default async function Home() {
  const { market } = await getMarketContext();
  const copy = LANDING_COPY[market.uiLanguage];
  const ctaHref = `/${market.code}/vytvorit`;

  return (
    <main>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-3 sm:px-10">
        {/* Identita dočasne TAKTIK; pri vlastnej značke sa vymení logo a tokeny v globals.css. */}
        <Link href={`/${market.code}`} aria-label="TAKTIK">
          <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={81} height={72} priority unoptimized />
        </Link>
        <Link
          href={ctaHref}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30"
        >
          {copy.cta}
        </Link>
      </header>

      <BookHero copy={copy} ctaHref={ctaHref} />
    </main>
  );
}

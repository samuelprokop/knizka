import Image from "next/image";
import Link from "next/link";

import { getMarketContext } from "@/i18n/server";

/**
 * Hlavička stránok mimo konfigurátora (košík, pokladňa, objednávka, osobná
 * stránka knihy): logo so spiatočnou cestou na úvod, zarovnané s obsahom
 * košíka a pokladne.
 */
export async function ShopHeader({ wide = false }: { wide?: boolean }) {
  const { market } = await getMarketContext();
  return (
    <header className="border-b border-ink/10 bg-white">
      <div className={`mx-auto flex items-center px-4 py-2 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        <Link href={`/${market.code}`} aria-label="TAKTIK" className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
          <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={56} height={50} unoptimized />
        </Link>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";

import { getMarketContext } from "@/i18n/server";
import { MotionCta } from "./buttons";
import { HomeIcon } from "./icons";

/**
 * Hlavička stránok mimo konfigurátora (košík, pokladňa, objednávka, osobná
 * stránka knihy): logo so spiatočnou cestou na úvod, zarovnané s obsahom
 * košíka a pokladne.
 */
export async function ShopHeader({
  wide = false,
  cta = false,
  home = false,
}: {
  /** Šírka obsahu stránky: true = košík a pokladňa, "book" = osobná stránka s listovaním. */
  wide?: boolean | "book";
  /** Obsahové stránky (otázky, podmienky): výzva „Vytvoriť knihu“ vpravo. */
  cta?: boolean;
  /** Stránky mimo nákupu (stav objednávky, osobná stránka, ďalší výtlačok): viditeľný odkaz na úvod. */
  home?: boolean;
}) {
  const { market, t } = await getMarketContext();
  return (
    <header className="border-b border-ink/10 bg-white">
      <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-2 ${wide === "book" ? "max-w-6xl sm:px-6" : wide ? "max-w-5xl" : "max-w-2xl"}`}>
        <Link href={`/${market.code}`} aria-label="TAKTIK" className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
          <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={56} height={50} unoptimized />
        </Link>
        {home && (
          <Link
            href={`/${market.code}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink/75 outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40"
          >
            <HomeIcon className="size-4" />
            {t("thanks.home")}
          </Link>
        )}
        {cta && (
          <MotionCta href={`/${market.code}/vytvorit`} className="text-[0.9375rem]">
            {t("footer.cta")}
          </MotionCta>
        )}
      </div>
    </header>
  );
}

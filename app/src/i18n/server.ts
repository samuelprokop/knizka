import { notFound } from "next/navigation";
import { market as marketParam } from "next/root-params";

import { getMarket, isMarketCode, type Market } from "@/config/markets";
import { createTranslator, type Translator } from "./format";

/**
 * Trh a prekladač pre aktuálnu stránku – číta koreňový parameter [market],
 * takže netreba posielať trh cez props. Len v Server Components.
 */
export async function getMarketContext(): Promise<{ market: Market; t: Translator }> {
  const code = await marketParam();
  if (!code || !isMarketCode(code)) notFound();
  const market = getMarket(code);
  return { market, t: createTranslator(market.uiLanguage) };
}

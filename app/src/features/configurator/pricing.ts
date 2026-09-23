/*
  Výber pre výpočet ceny z údajov projektu. Cena sa zobrazuje v lište
  a prepočítava pri každej voľbe (proces: „Cena vždy viditeľná“).
*/

import type { BookFormat, PageCount, StoryPath } from "@/config/catalog";
import type { PriceSelection } from "@/domain/pricing";

export type PriceInputs = {
  storyPath: StoryPath | null;
  companionCount: number;
  pageCount: number;
  format: string;
  coloringBook: boolean;
  /** Variant a doplnky sa volia až v košíku (balík D) – v konfigurátore platia predvolené hodnoty. */
  variant?: "print_ebook" | "ebook";
  extraCopies?: number;
  giftWrap?: boolean;
};

export function priceSelection(input: PriceInputs): PriceSelection {
  return {
    variant: input.variant ?? "print_ebook",
    storyPath: input.storyPath ?? "A",
    extraCharacters: input.companionCount,
    pageCount: (input.pageCount === 40 ? 40 : 32) as PageCount,
    format: (input.format === "A4" ? "A4" : "A5") as BookFormat,
    coloringBook: input.coloringBook,
    extraCopies: input.extraCopies ?? 0,
    giftWrap: input.giftWrap ?? false,
  };
}

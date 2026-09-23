/*
  Cena knihy s rozpisom príplatkov – prepočítava sa pri každej voľbe
  (proces: „Cena vždy viditeľná“). Čisté funkcie bez DB, dajú sa volať
  na serveri aj v klientovi.
*/

import type { BookFormat, PageCount, StoryPath } from "@/config/catalog";
import type { Market } from "@/config/markets";

export type PriceSelection = {
  variant: "print_ebook" | "ebook";
  storyPath: StoryPath;
  extraCharacters: number;
  pageCount: PageCount;
  format: BookFormat;
  coloringBook: boolean;
  extraCopies: number;
  giftWrap: boolean;
};

export type PriceLine = {
  /** Kľúč pre text položky (napr. "base", "custom_story"). */
  id: string;
  quantity: number;
  amountMinor: number;
};

export type PriceBreakdown = {
  currency: Market["currency"];
  base: PriceLine;
  surcharges: PriceLine[];
  totalMinor: number;
};

export function computePrice(selection: PriceSelection, market: Market): PriceBreakdown {
  const p = market.prices;
  const isPrint = selection.variant === "print_ebook";
  const base: PriceLine = {
    id: isPrint ? "base_print_ebook" : "base_ebook",
    quantity: 1,
    amountMinor: isPrint ? p.basePrintAndEbook : p.ebookOnly,
  };

  const surcharges: PriceLine[] = [];
  const add = (id: string, quantity: number, unitMinor: number) => {
    if (quantity > 0 && unitMinor !== 0) surcharges.push({ id, quantity, amountMinor: quantity * unitMinor });
  };

  if (selection.storyPath === "C" || selection.storyPath === "D") add("custom_story", 1, p.customStory);
  add("extra_character", selection.extraCharacters, p.extraCharacter);
  if (selection.pageCount === 40) add("pages_40", 1, p.pages40);
  if (selection.coloringBook) add("coloring_book", 1, p.coloringBook);
  if (isPrint) {
    add(`format_${selection.format}`, 1, p.format[selection.format]);
    add("extra_copy", selection.extraCopies, p.extraCopy);
    if (selection.giftWrap) add("gift_wrap", 1, p.giftWrap);
  }

  const totalMinor = base.amountMinor + surcharges.reduce((sum, line) => sum + line.amountMinor, 0);
  return { currency: market.currency, base, surcharges, totalMinor };
}

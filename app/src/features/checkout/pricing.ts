/*
  Cena objednávky v košíku/pokladnici: rozpis knihy (computePrice) + doprava
  (dopravca z config/markets, zdarma od freeShippingFromMinor) + zľava
  (voucher.ts). Čistá funkcia – ukladá sa ako snímka do orders.priceBreakdown.
*/

import { computePrice, type PriceLine, type PriceSelection } from "@/domain/pricing";
import type { Market } from "@/config/markets";
import { validateVoucherCode, voucherDiscountMinor, type VoucherResult } from "./voucher";

export type CartChoice = {
  variant: PriceSelection["variant"];
  extraCopies: number;
  giftWrap: boolean;
  /** Dopravca z market.carriers – len pri variante s tlačou. */
  carrierId: string | null;
  voucherCode: string;
};

export type OrderPriceBreakdown = {
  currency: Market["currency"];
  base: PriceLine;
  surcharges: PriceLine[];
  shipping: PriceLine | null;
  discount: PriceLine | null;
  totalMinor: number;
};

export function computeOrderPrice(selection: PriceSelection, market: Market, choice: Pick<CartChoice, "carrierId" | "voucherCode">): OrderPriceBreakdown {
  const book = computePrice(selection, market);
  const isPrint = selection.variant === "print_ebook";

  let shipping: PriceLine | null = null;
  if (isPrint) {
    const carrier = market.carriers.find((c) => c.id === choice.carrierId) ?? market.carriers[0];
    const free = book.totalMinor >= market.freeShippingFromMinor;
    shipping = { id: `shipping_${carrier.id}`, quantity: 1, amountMinor: free ? 0 : carrier.priceMinor };
  }

  const subtotal = book.totalMinor + (shipping?.amountMinor ?? 0);
  const voucher = choice.voucherCode.trim() ? validateVoucherCode(choice.voucherCode, market.code) : null;
  const discountMinor = voucher ? voucherDiscountMinor(voucher, subtotal) : 0;
  const discount: PriceLine | null = discountMinor > 0 && voucher?.ok ? { id: `voucher_${voucher.code}`, quantity: 1, amountMinor: -discountMinor } : null;

  return {
    currency: book.currency,
    base: book.base,
    surcharges: book.surcharges,
    shipping,
    discount,
    totalMinor: subtotal - discountMinor,
  };
}

export function voucherFeedback(code: string, market: Market): VoucherResult | null {
  return code.trim() ? validateVoucherCode(code, market.code) : null;
}

/**
 * Koľko chýba do dopravy zadarmo (null = bez tlače, 0 = doprava už je zadarmo).
 * Rovnaké pravidlo ako v computeOrderPrice – porovnáva sa cena knihy s doplnkami.
 */
export function freeShippingGapMinor(selection: PriceSelection, market: Market): number | null {
  if (selection.variant !== "print_ebook") return null;
  return Math.max(0, market.freeShippingFromMinor - computePrice(selection, market).totalMinor);
}

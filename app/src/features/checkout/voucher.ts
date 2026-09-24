/*
  Zľavový kód a darčeková poukážka (K10, O7) – zatiaľ len MOCK zoznam, kým sa
  nerozhodne Shopify vs. vlastná pokladnica (obchod značky vydáva skutočné
  kódy). Čistá funkcia, žiadna DB – validácia je okamžitá pri zadaní kódu.

  "percent" = bežný zľavový kód; "amount" = darčeková poukážka na pevnú sumu
  (O7: pokrýva hodnotu knihy vrátane dopravy, rozdiel doplatí zákazník – tu
  ide jednoducho o odpočet pevnej sumy z medzisúčtu).
*/

import type { MarketCode } from "@/config/markets";

type VoucherDefinition =
  | { kind: "percent"; percent: number; market?: MarketCode }
  | { kind: "amount"; amountMinor: number; market?: MarketCode };

/** Ukážkové kódy pre vývoj a demo – nahradí obchod značky. */
const MOCK_VOUCHERS: Record<string, VoucherDefinition> = {
  VITAJTE10: { kind: "percent", percent: 10 },
  NARODENINY15: { kind: "percent", percent: 15 },
  BABKA20: { kind: "percent", percent: 20 },
  "ZLAVA5-SK": { kind: "amount", amountMinor: 500, market: "sk" },
  "SLEVA100-CZ": { kind: "amount", amountMinor: 10000, market: "cz" },
  "DARCEK-SK": { kind: "amount", amountMinor: 3290, market: "sk" },
  "DARCEK-CZ": { kind: "amount", amountMinor: 79900, market: "cz" },
};

export type VoucherResult =
  | { ok: true; code: string; kind: "percent"; percent: number }
  | { ok: true; code: string; kind: "amount"; amountMinor: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "wrong_market" };

export function validateVoucherCode(rawCode: string, market: MarketCode): VoucherResult {
  const code = rawCode.trim().toUpperCase();
  const def = MOCK_VOUCHERS[code];
  if (!def) return { ok: false, reason: "not_found" };
  if (def.market && def.market !== market) return { ok: false, reason: "wrong_market" };
  return def.kind === "percent" ? { ok: true, code, kind: "percent", percent: def.percent } : { ok: true, code, kind: "amount", amountMinor: def.amountMinor };
}

/** Zľava v najmenších jednotkách meny – nikdy viac, než je medzisúčet (cena nejde do mínusu). */
export function voucherDiscountMinor(result: VoucherResult, subtotalMinor: number): number {
  if (!result.ok) return 0;
  const raw = result.kind === "percent" ? Math.round((subtotalMinor * result.percent) / 100) : result.amountMinor;
  return Math.min(raw, subtotalMinor);
}

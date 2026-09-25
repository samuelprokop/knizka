/*
  Trh je konfigurácia, nie vetva kódu (špecifikácia: Viactrhová architektúra).
  Nový trh = nový záznam tu (neskôr v administrácii), žiadny zásah do komponentov.

  Ceny sú v najmenších jednotkách meny (centy / haliere) – nikdy nie float.
*/

import type { BookLanguage } from "@/i18n/locales";

export const MARKET_CODES = ["sk", "cz"] as const;
export type MarketCode = (typeof MARKET_CODES)[number];

export type Currency = "EUR" | "CZK";

/** Platobné metódy – zatiaľ len placeholdery bez napojenia na bránu. */
export type PaymentMethod = "card" | "apple_pay" | "google_pay" | "bank_button" | "cod";

export type Carrier = { id: string; name: string; priceMinor: number; pickupPoint: boolean };

export type MarketPrices = {
  /** Kniha 32 strán s hotovým príbehom vrátane e-knihy. */
  basePrintAndEbook: number;
  /** Samostatná e-kniha. */
  ebookOnly: number;
  customStory: number;
  extraCharacter: number;
  pages40: number;
  coloringBook: number;
  extraCopy: number;
  giftWrap: number;
  /** Príplatok podľa formátu – PLACEHOLDER, čaká na cenník tlačiarne. */
  format: Record<"A4" | "A5", number>;
};

export type Market = {
  code: MarketCode;
  /** Jazyk rozhrania. */
  uiLanguage: BookLanguage;
  /** Jazyky, v ktorých si zákazník môže dať knihu vytvoriť. */
  bookLanguages: BookLanguage[];
  intlLocale: string;
  currency: Currency;
  prices: MarketPrices;
  /** DPH na tlačenú knihu a e-knihu v percentách – potvrdí daňový poradca. */
  vatBookPercent: number;
  paymentMethods: PaymentMethod[];
  /**
   * Dobierka pre personalizovanú knihu – špecifikácia (O4) ju vypína, zadávateľ ju zatiaľ
   * chce zapnutú (rozhodnutie balíka D, otvorené). Košík/pokladnica túto voľbu berie namiesto
   * `"cod" in paymentMethods`, aby sa dala kedykoľvek vypnúť len konfiguráciou.
   */
  codAllowedForPersonalizedBook: boolean;
  carriers: Carrier[];
  freeShippingFromMinor: number;
  deliveryWorkingDays: number;
  /** Štátne sviatky s pevným dátumom ("MM-DD") – nepracovné dni pri odhade doručenia (Veľký piatok a pondelok sa rátajú zvlášť). */
  holidays: string[];
  supportEmail: string;
  /**
   * Úvodná zľava novej značky – kód, ktorý si zákazník v pokladni odkryje (null = vypnuté).
   * Musí existovať medzi kódmi v features/checkout/voucher.ts.
   */
  launchVoucherCode: string | null;
};

export const MARKETS: Record<MarketCode, Market> = {
  sk: {
    code: "sk",
    uiLanguage: "sk",
    bookLanguages: ["sk", "cs"],
    intlLocale: "sk-SK",
    currency: "EUR",
    prices: {
      basePrintAndEbook: 3290,
      ebookOnly: 990,
      customStory: 500,
      extraCharacter: 300,
      pages40: 600,
      coloringBook: 490,
      extraCopy: 2490,
      giftWrap: 390,
      format: { A4: 0, A5: 0 },
    },
    vatBookPercent: 5,
    paymentMethods: ["card", "apple_pay", "google_pay", "bank_button", "cod"],
    // Dobierka je tu na želanie zadávateľa; špecifikácia (O4) ju pri personalizovanej
    // knihe vypína – rozhodnutie balíka D (otvorené), pozri handoff.
    codAllowedForPersonalizedBook: true,
    carriers: [
      { id: "packeta", name: "Packeta", priceMinor: 295, pickupPoint: true },
      { id: "gls", name: "GLS", priceMinor: 395, pickupPoint: false },
    ],
    freeShippingFromMinor: 4500,
    deliveryWorkingDays: 5,
    holidays: ["01-01", "01-06", "05-01", "05-08", "07-05", "08-29", "09-15", "11-01", "12-24", "12-25", "12-26"],
    supportEmail: "podpora@example.sk",
    launchVoucherCode: "VITAJTE10",
  },
  cz: {
    code: "cz",
    uiLanguage: "cs",
    bookLanguages: ["cs", "sk"],
    intlLocale: "cs-CZ",
    currency: "CZK",
    // České ceny sú samostatný cenník, nie prepočet kurzom.
    prices: {
      basePrintAndEbook: 79900,
      ebookOnly: 24900,
      customStory: 12000,
      extraCharacter: 7500,
      pages40: 15000,
      coloringBook: 12000,
      extraCopy: 59900,
      giftWrap: 9900,
      format: { A4: 0, A5: 0 },
    },
    vatBookPercent: 0,
    paymentMethods: ["card", "apple_pay", "google_pay", "bank_button", "cod"],
    codAllowedForPersonalizedBook: true,
    carriers: [
      { id: "zasilkovna", name: "Zásilkovna", priceMinor: 7900, pickupPoint: true },
      { id: "gls", name: "GLS", priceMinor: 9900, pickupPoint: false },
    ],
    freeShippingFromMinor: 115000,
    deliveryWorkingDays: 5,
    holidays: ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"],
    supportEmail: "podpora@example.cz",
    launchVoucherCode: "VITEJTE10",
  },
};

export const DEFAULT_MARKET: MarketCode = "sk";

export const isMarketCode = (value: string): value is MarketCode =>
  (MARKET_CODES as readonly string[]).includes(value);

export const getMarket = (code: MarketCode): Market => MARKETS[code];

export function formatMoney(amountMinor: number, market: Market) {
  return new Intl.NumberFormat(market.intlLocale, {
    style: "currency",
    currency: market.currency,
    minimumFractionDigits: market.currency === "CZK" ? 0 : 2,
    maximumFractionDigits: market.currency === "CZK" ? 0 : 2,
  }).format(amountMinor / 100);
}

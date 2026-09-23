import "server-only";

import type { Market, PaymentMethod } from "@/config/markets";

/*
  PLACEHOLDER platieb – bez napojenia na bránu. Rozhranie je pripravené tak,
  aby sa neskôr vymenilo za skutočnú bránu (GoPay, Comgate, TrustPay, Stripe
  alebo obchod na Shopify) bez zmeny volajúceho kódu.

  Potvrdenie platby musí byť idempotentné (O3): rovnaké externalPaymentId
  spracované dvakrát nesmie spustiť výrobu dvakrát.
*/

export type CreatePaymentInput = {
  orderId: string;
  market: Market;
  method: PaymentMethod;
  amountMinor: number;
  returnUrl: string;
};

export type CreatePaymentResult =
  /** Presmerovanie na bránu (karta, Apple/Google Pay, bankové tlačidlo). */
  | { kind: "redirect"; url: string; externalPaymentId: string }
  /** Platba pri doručení – objednávka pokračuje bez online platby. */
  | { kind: "offline"; externalPaymentId: string };

export interface PaymentProvider {
  readonly id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}

export const placeholderPaymentProvider: PaymentProvider = {
  id: "placeholder",
  async createPayment({ orderId, method, returnUrl }) {
    const externalPaymentId = `placeholder_${orderId}`;
    if (method === "cod") return { kind: "offline", externalPaymentId };
    // Simulovaná brána: rovno sa vráti na returnUrl ako zaplatené.
    const url = new URL(returnUrl);
    url.searchParams.set("payment", externalPaymentId);
    url.searchParams.set("status", "paid");
    return { kind: "redirect", url: url.toString(), externalPaymentId };
  },
};

export const getPaymentProvider = (): PaymentProvider => placeholderPaymentProvider;

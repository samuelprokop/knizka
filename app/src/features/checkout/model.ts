import type { PaymentMethod } from "@/config/markets";

/**
 * Adresa alebo výdajné miesto – nikdy meno dieťaťa (O2). Dopravca (`carrierId`, z
 * `market.carriers`) určuje, ktoré polia sú vyplnené: `carrier.pickupPoint === true`
 * → `pickupPointLabel` (zástupný výber – konkrétnu pobočku doplní dopravca, K10);
 * inak `street`/`city`/`zip` (doručenie na adresu).
 */
export type DeliveryInfo = {
  carrierId: string;
  name: string;
  street: string;
  city: string;
  zip: string;
  pickupPointLabel: string;
};

export type InvoiceInfo = { companyName: string; ico: string; dic: string } | null;

/** Uložené v orders.shipping – doprava a prípadná fakturácia na firmu spolu. */
export type OrderShipping = {
  delivery: DeliveryInfo | null;
  invoice: InvoiceInfo;
};

export type CheckoutInput = {
  projectId: string;
  bookVersionId: string;
  email: string;
  variant: "print_ebook" | "ebook";
  extraCopies: number;
  giftWrap: boolean;
  carrierId: string | null;
  address: { name: string; street: string; city: string; zip: string; pickupPointLabel: string } | null;
  invoice: InvoiceInfo;
  voucherCode: string;
  paymentMethod: PaymentMethod;
  termsAccepted: boolean;
};

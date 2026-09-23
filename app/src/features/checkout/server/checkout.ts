import "server-only";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

import { getMarket, isMarketCode } from "@/config/markets";
import type { PriceSelection } from "@/domain/pricing";
import { lookOf } from "@/features/configurator/server/book";
import { loadBundle } from "@/features/configurator/server/bundle";
import { recordConsents } from "@/features/configurator/server/consents";
import { isBookLanguage } from "@/i18n/locales";
import { getPaymentProvider } from "@/server/payments";
import type { CheckoutInput, DeliveryInfo } from "../model";
import { computeOrderPrice } from "../pricing";
import { attachExternalPaymentId, confirmPayment, createOrder } from "./orders";

export class CheckoutError extends Error {
  constructor(public readonly key: string) {
    super(key);
  }
}

const REORDERABLE_STATUSES = ["paid", "in_review", "fixing", "awaiting_customer", "printing", "shipped", "delivered"];

/** Vytvorí objednávku, spustí platbu (placeholder) a vráti adresu, kam presmerovať prehliadač. */
export async function submitCheckout(input: CheckoutInput, context: { origin: string; userAgent: string | null }): Promise<{ redirectUrl: string }> {
  const bundle = await loadBundle(input.projectId);
  if (!bundle) throw new CheckoutError("error.generic");
  const { project } = bundle;
  if (!isMarketCode(project.market) || !isBookLanguage(project.bookLanguage)) {
    throw new CheckoutError("error.generic");
  }
  if (project.status !== "approved_by_customer" && !REORDERABLE_STATUSES.includes(project.status)) {
    throw new CheckoutError("error.generic");
  }
  // K10 „Hraničné stavy“: medzičasom zmenená/znova schválená kniha má inú (zamknutú) verziu.
  if (!bundle.book?.lockedAt || bundle.book.id !== input.bookVersionId) {
    throw new CheckoutError("checkout.error.stale_version");
  }
  if (!input.termsAccepted) throw new CheckoutError("error.generic");

  const market = getMarket(project.market);
  if (!market.paymentMethods.includes(input.paymentMethod)) throw new CheckoutError("error.generic");
  if (input.paymentMethod === "cod" && !market.codAllowedForPersonalizedBook) throw new CheckoutError("error.generic");

  const isPrint = input.variant === "print_ebook";
  const selection: PriceSelection = {
    variant: input.variant,
    storyPath: project.storyPath ?? "A",
    extraCharacters: bundle.companions.length,
    pageCount: project.pageCount === 40 ? 40 : 32,
    format: project.format === "A4" ? "A4" : "A5",
    coloringBook: lookOf(bundle).coloringBook,
    extraCopies: isPrint ? Math.max(0, Math.min(Math.trunc(input.extraCopies), 20)) : 0,
    giftWrap: isPrint && input.giftWrap,
  };

  let delivery: DeliveryInfo | null = null;
  if (isPrint) {
    const carrier = market.carriers.find((c) => c.id === input.carrierId);
    const a = input.address;
    if (!carrier || !a?.name.trim()) throw new CheckoutError("error.generic");
    if (carrier.pickupPoint) {
      if (!a.pickupPointLabel.trim()) throw new CheckoutError("error.generic");
      delivery = { carrierId: carrier.id, name: a.name.trim(), street: "", city: "", zip: "", pickupPointLabel: a.pickupPointLabel.trim() };
    } else {
      if (!a.street.trim() || !a.city.trim() || !a.zip.trim()) throw new CheckoutError("error.generic");
      delivery = { carrierId: carrier.id, name: a.name.trim(), street: a.street.trim(), city: a.city.trim(), zip: a.zip.trim(), pickupPointLabel: "" };
    }
  }

  const invoice =
    input.invoice && input.invoice.companyName.trim() && input.invoice.ico.trim()
      ? { companyName: input.invoice.companyName.trim(), ico: input.invoice.ico.trim(), dic: input.invoice.dic.trim() }
      : null;

  const price = computeOrderPrice(selection, market, { carrierId: delivery?.carrierId ?? null, voucherCode: input.voucherCode });

  if (input.email.trim() && input.email.trim() !== project.email) {
    await db.update(schema.projects).set({ email: input.email.trim() }).where(eq(schema.projects.id, project.id));
  }

  const orderId = await createOrder({
    projectId: project.id,
    bookVersionId: input.bookVersionId,
    market: market.code,
    currency: market.currency,
    variant: input.variant,
    paymentMethod: input.paymentMethod,
    totalMinor: price.totalMinor,
    priceBreakdown: price,
    shipping: { delivery, invoice },
  });

  await recordConsents(project.id, [{ type: "terms", granted: true, textKey: "checkout.terms" }], {
    language: project.bookLanguage,
    userAgent: context.userAgent,
  });

  const returnUrl = `${context.origin}/${market.code}/objednavka/${orderId}/vysledok`;
  const payment = await getPaymentProvider().createPayment({
    orderId,
    market,
    method: input.paymentMethod,
    amountMinor: price.totalMinor,
    returnUrl,
  });
  await attachExternalPaymentId(orderId, payment.externalPaymentId);

  if (payment.kind === "offline") {
    await confirmPayment(orderId, payment.externalPaymentId);
    return { redirectUrl: `/${market.code}/objednavka/${orderId}/dakujeme` };
  }
  return { redirectUrl: payment.url };
}

"use server";

import { redirect } from "next/navigation";

import { requestOrigin, userAgent } from "@/features/configurator/actions/common";
import { AccessDeniedError, assertProjectSession } from "@/features/configurator/server/session";
import type { PaymentMethod } from "@/config/markets";
import type { CheckoutInput } from "./model";
import { CheckoutError, submitCheckout } from "./server/checkout";
import { getOrder } from "./server/orders";
import { ComplaintError, COMPLAINT_TYPES, submitComplaint, type ComplaintType } from "./server/complaints";

/** Zoznam bez "" – formulárové polia, ktoré zákazník nevyplnil, sú prázdny reťazec, nie chýbajúce. */
const str = (data: FormData, key: string) => (data.get(key) ?? "").toString();

/**
 * Odošle formulár pokladnice: vytvorí objednávku, spustí platbu (placeholder) a hneď
 * presmeruje – funguje aj bez JS (obyčajný POST formulár), chyba sa vráti ako query.
 */
export async function submitCheckoutAction(formData: FormData): Promise<void> {
  const projectId = str(formData, "projectId");
  const market = str(formData, "market");

  const input: CheckoutInput = {
    projectId,
    bookVersionId: str(formData, "bookVersionId"),
    email: str(formData, "email"),
    variant: str(formData, "variant") === "ebook" ? "ebook" : "print_ebook",
    extraCopies: Number(str(formData, "extraCopies")) || 0,
    giftWrap: formData.get("giftWrap") === "on",
    carrierId: str(formData, "carrierId") || null,
    address: {
      name: str(formData, "addressName"),
      street: str(formData, "addressStreet"),
      city: str(formData, "addressCity"),
      zip: str(formData, "addressZip"),
      pickupPointLabel: str(formData, "pickupPointLabel"),
    },
    invoice:
      formData.get("invoiceToggle") === "on"
        ? { companyName: str(formData, "invoiceCompanyName"), ico: str(formData, "invoiceIco"), dic: str(formData, "invoiceDic") }
        : null,
    voucherCode: str(formData, "voucherCode"),
    paymentMethod: str(formData, "paymentMethod") as PaymentMethod,
    termsAccepted: formData.get("termsAccepted") === "on",
  };

  let redirectUrl: string;
  try {
    await assertProjectSession(projectId);
    const origin = await requestOrigin();
    const ua = await userAgent();
    ({ redirectUrl } = await submitCheckout(input, { origin, userAgent: ua }));
  } catch (error) {
    const key = error instanceof CheckoutError ? error.key : error instanceof AccessDeniedError ? "error.session_expired" : "error.generic";
    redirect(`/${market}/objednavka?projekt=${projectId}&chyba=${encodeURIComponent(key)}`);
  }
  redirect(redirectUrl);
}

/** „Niečo nie je v poriadku“ na stránke objednávky – zápis + e-mail podpore (žiadny tiket, K10). */
export async function submitComplaintAction(formData: FormData): Promise<void> {
  const orderId = str(formData, "orderId");
  const market = str(formData, "market");
  const order = await getOrder(orderId);
  if (!order) redirect(`/${market}/objednavka/${orderId}`);

  try {
    await assertProjectSession(order.projectId);
    const type = str(formData, "type") as ComplaintType;
    if (!COMPLAINT_TYPES.includes(type)) throw new ComplaintError("error.generic");
    await submitComplaint(orderId, { type, message: str(formData, "message") });
  } catch (error) {
    const key = error instanceof ComplaintError ? error.key : error instanceof AccessDeniedError ? "error.session_expired" : "error.generic";
    redirect(`/${market}/objednavka/${orderId}?chyba=${encodeURIComponent(key)}`);
  }
  redirect(`/${market}/objednavka/${orderId}?reklamacia=1`);
}

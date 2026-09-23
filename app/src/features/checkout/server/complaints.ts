import "server-only";

import { getMarket, isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { createTranslator } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";
import { getMailer } from "@/server/email";
import { getOrder, orderRefOf } from "./orders";

/* Reklamácia (O9, K10 „Reklamácia a oprava po doručení“) – zatiaľ bez tiketov
   a fotky (žiadne nahrávanie príloh mimo fotiek dieťaťa, S5): zápis do audit_log
   a e-mail podpore. Odpoveď človeka a prípadnú dotlač zdarma rieši administrácia (E). */

export const COMPLAINT_TYPES = ["damaged", "print_error", "mismatch", "not_delivered", "other"] as const;
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];

export class ComplaintError extends Error {
  constructor(public readonly key: string) {
    super(key);
  }
}

export async function submitComplaint(orderId: string, input: { type: ComplaintType; message: string }) {
  const order = await getOrder(orderId);
  if (!order) throw new ComplaintError("error.generic");
  if (!COMPLAINT_TYPES.includes(input.type)) throw new ComplaintError("error.generic");
  const message = input.message.trim().slice(0, 2000);
  if (!message) throw new ComplaintError("error.generic");

  await db.insert(schema.auditLog).values({
    actor: "customer",
    action: "complaint",
    subjectType: "order",
    subjectId: order.id,
    reason: `${input.type}: ${message}`,
  });

  if (!isMarketCode(order.market)) return;
  const market = getMarket(order.market);
  const t = createTranslator(market.uiLanguage);
  await getMailer().send({
    to: market.supportEmail,
    kind: "complaint",
    subject: `${t(`complaint.type.${input.type}` as MessageKey)} – ${orderRefOf(order)}`,
    url: `${process.env.APP_URL ?? "http://localhost:3000"}/${market.code}/objednavka/${order.id}`,
  });
}

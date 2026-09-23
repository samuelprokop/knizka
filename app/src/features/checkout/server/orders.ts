import "server-only";

import { eq } from "drizzle-orm";

import { assertTransition } from "@/domain/project-status";
import { db, schema } from "@/db";
import type { MarketCode } from "@/config/markets";
import type { OrderPriceBreakdown } from "../pricing";
import type { OrderShipping } from "../model";
import { triggerProductionAfterPayment } from "./production";

export type Order = typeof schema.orders.$inferSelect;

/** Číslo objednávky pre tiráž a e-maily – PLACEHOLDER číslovania, kým ho neurčí administrácia (E). */
export const orderRefOf = (order: Pick<Order, "id" | "market">) => `${order.market.toUpperCase()}-${order.id.slice(0, 8).toUpperCase()}`;

export async function createOrder(input: {
  projectId: string;
  bookVersionId: string;
  market: MarketCode;
  currency: Order["currency"];
  variant: "print_ebook" | "ebook";
  paymentMethod: string;
  totalMinor: number;
  priceBreakdown: OrderPriceBreakdown;
  shipping: OrderShipping;
}): Promise<string> {
  const [row] = await db
    .insert(schema.orders)
    .values({
      projectId: input.projectId,
      bookVersionId: input.bookVersionId,
      market: input.market,
      currency: input.currency,
      variant: input.variant,
      paymentMethod: input.paymentMethod,
      totalMinor: input.totalMinor,
      priceBreakdown: input.priceBreakdown,
      shipping: input.shipping,
    })
    .returning({ id: schema.orders.id });
  return row.id;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  return order ?? null;
}

/** Nastaví externé ID platby hneď po vytvorení platby u poskytovateľa (pred presmerovaním). */
export async function attachExternalPaymentId(orderId: string, externalPaymentId: string) {
  await db.update(schema.orders).set({ externalPaymentId }).where(eq(schema.orders.id, orderId));
}

/**
 * Potvrdenie platby (O3) – idempotentné: opakovaná notifikácia s rovnakým
 * externalPaymentId nájde objednávku už v stave "paid" a nič ďalšie nespustí.
 * Výroba (e-kniha, prechod projektu) sa spustí len raz, len pre prvú objednávku
 * projektu (reorder – ďalší výtlačok – necháva stav projektu bez zmeny).
 */
export async function confirmPayment(orderId: string, externalPaymentId: string): Promise<{ order: Order; alreadyProcessed: boolean }> {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!order) throw new Error("Objednávka neexistuje");
    if (order.status !== "pending_payment") return { order, alreadyProcessed: true, isFirstOrder: false };

    const [updated] = await tx
      .update(schema.orders)
      .set({ status: "paid", paidAt: new Date(), externalPaymentId })
      .where(eq(schema.orders.id, orderId))
      .returning();

    const project = await tx.query.projects.findFirst({ where: eq(schema.projects.id, order.projectId) });
    const isFirstOrder = project?.status === "approved_by_customer";
    if (project && isFirstOrder) {
      assertTransition("approved_by_customer", "paid");
      assertTransition("paid", "in_review");
      await tx.update(schema.projects).set({ status: "in_review" }).where(eq(schema.projects.id, project.id));
    }
    return { order: updated, alreadyProcessed: false, isFirstOrder: Boolean(isFirstOrder) };
  });

  if (!result.alreadyProcessed) {
    // Mimo transakcie (render PDF trvá sekundy, nesmie držať zámok riadku) – zlyhanie
    // sa loguje, ale platbu už nevracia; výroba sa dá dobehnúť ručne (bez administrácie zatiaľ).
    await triggerProductionAfterPayment(result.order, { isFirstOrder: result.isFirstOrder }).catch((error: unknown) => {
      console.error(`Výroba po platbe zlyhala pre objednávku ${result.order.id}:`, error);
    });
  }

  return { order: result.order, alreadyProcessed: result.alreadyProcessed };
}

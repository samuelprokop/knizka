import "server-only";

import { and, eq } from "drizzle-orm";

import { getMarket, isMarketCode } from "@/config/markets";
import { db, schema } from "@/db";
import { loadBookVersion, personalPageUrl } from "@/features/book/server/versions";
import { nameContextOf } from "@/features/configurator/server/bundle";
import { createTranslator } from "@/i18n/format";
import { getMailer } from "@/server/email";
import { renderBookPdfInWorker } from "@/server/render";
import { storage } from "@/server/storage";
import { estimatedDelivery } from "@/domain/delivery";
import { scheduleLifecycleEmail } from "@/server/jobs/lifecycle";
import { orderRefOf, type Order } from "./orders";

/** Koľko dní po odhadovanom doručení požiadať o hodnotenie (dieťa si knihu stihne prečítať). */
const REVIEW_AFTER_DELIVERY_DAYS = 5;

/*
  Výroba po zaplatení: e-kniha ihneď (K10 – „E-kniha ihneď po zaplatení“), tlačové
  PDF len pri variante s tlačou. Volá sa raz na zaplatenú objednávku (confirmPayment
  v orders.ts to zaisťuje) – opakované volanie sem samo o sebe nie je chránené,
  preto to nikdy nevolaj priamo mimo confirmPayment.
*/

export async function triggerProductionAfterPayment(order: Order, opts: { isFirstOrder: boolean }) {
  if (!order.bookVersionId) return;
  const book = await loadBookVersion(order.bookVersionId);
  if (!book) return;

  const orderRef = orderRefOf(order);
  const finalBook = { ...book, meta: { ...book.meta, orderRef } };

  const ebookPdf = await renderBookPdfInWorker(finalBook, "ebook");
  await storage.put(`pdf/${order.id}-ebook.pdf`, ebookPdf, "application/pdf");

  if (order.variant === "print_ebook") {
    const [interior, cover] = await Promise.all([
      renderBookPdfInWorker(finalBook, "print-interior"),
      renderBookPdfInWorker(finalBook, "print-cover"),
    ]);
    await storage.put(`pdf/${order.id}-print-interior.pdf`, interior, "application/pdf");
    await storage.put(`pdf/${order.id}-print-cover.pdf`, cover, "application/pdf");
  }

  // Ďalší výtlačok (O6) nemení stav projektu ani neposiela znova potvrdenie objednávky
  // rovnakým znením – projekt už svoj "Ďakujeme" e-mail dostal pri prvej platbe.
  if (opts.isFirstOrder) await sendOrderConfirmation(order);

  // Žiadosť o recenziu až po doručení tlačenej knihy (A4): odhad doručenia + pár dní na prečítanie.
  if (opts.isFirstOrder && order.variant === "print_ebook" && isMarketCode(order.market)) {
    const delivered = estimatedDelivery(new Date(), getMarket(order.market));
    await scheduleLifecycleEmail(order.projectId, "review_request", new Date(delivered.getTime() + REVIEW_AFTER_DELIVERY_DAYS * 86_400_000));
  }
}

async function sendOrderConfirmation(order: Order) {
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, order.projectId) });
  if (!project?.email || !isMarketCode(project.market)) return;
  const hero = await db.query.characters.findFirst({
    where: and(eq(schema.characters.projectId, order.projectId), eq(schema.characters.role, "hero")),
  });
  if (!hero) return;

  const market = getMarket(project.market);
  const t = createTranslator(market.uiLanguage);
  await getMailer().send({
    to: project.email,
    kind: "order_confirmation",
    subject: t("email.subject.order", undefined, nameContextOf(hero)),
    url: personalPageUrl(project.market, project.personalToken),
  });
}

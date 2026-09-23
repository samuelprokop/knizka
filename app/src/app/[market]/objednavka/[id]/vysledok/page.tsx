import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getOrder, confirmPayment } from "@/features/checkout/server/orders";
import { buttonClass, Notice, StepTitle } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import { getMarketContext } from "@/i18n/server";

/*
  Návrat z platby (placeholderPaymentProvider rovno pripája ?payment=…&status=paid
  na returnUrl – simuluje serverovú notifikáciu brány, K10 "Platba zlyhá..."). Potvrdenie
  je idempotentné (O3): opakované zobrazenie tejto stránky (napr. F5) znova nič nespustí.
*/

export default async function PaymentResultPage({ params, searchParams }: PageProps<"/[market]/objednavka/[id]/vysledok">) {
  const { market, t } = await getMarketContext();
  const { id } = await params;
  const query = await searchParams;
  const order = await getOrder(id);
  if (!order || order.market !== market.code) notFound();
  if (!(await hasProjectSession(order.projectId))) notFound();

  const payment = typeof query.payment === "string" ? query.payment : null;
  const status = typeof query.status === "string" ? query.status : null;

  if (status === "paid" && payment) {
    await confirmPayment(order.id, payment);
    redirect(`/${market.code}/objednavka/${order.id}/dakujeme`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <StepTitle title={t("checkout.title")} />
      <Notice tone="error">{t("checkout.error.payment_failed")}</Notice>
      <Link href={`/${market.code}/kosik?projekt=${order.projectId}`} className={buttonClass("primary", "self-start")}>
        {t("common.try_again")}
      </Link>
    </main>
  );
}

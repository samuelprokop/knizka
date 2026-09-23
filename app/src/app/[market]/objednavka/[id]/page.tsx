import Link from "next/link";
import { notFound } from "next/navigation";

import { submitComplaintAction } from "@/features/checkout/actions";
import { COMPLAINT_TYPES } from "@/features/checkout/server/complaints";
import { getOrder, orderRefOf } from "@/features/checkout/server/orders";
import { buttonClass, Field, inputClass, Notice, StepTitle } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { ProjectStatus } from "@/domain/project-status";
import type { MessageKey } from "@/i18n/messages";
import { getMarketContext } from "@/i18n/server";

/** Stav objednávky zobrazuje stav PROJEKTU (jemnejšie kroky ako orders.status – K10 „Po platbe“). */
function statusKey(orderStatus: string, projectStatus: ProjectStatus | undefined): MessageKey {
  if (orderStatus === "pending_payment") return "status.waiting";
  if (orderStatus === "cancelled" || orderStatus === "refunded") return "status.waiting";
  switch (projectStatus) {
    case "paid":
      return "status.paid";
    case "in_review":
    case "fixing":
    case "awaiting_customer":
      return "status.checking";
    case "printing":
      return "status.printing";
    case "shipped":
      return "status.shipped";
    case "delivered":
      return "status.delivered";
    default:
      return "status.paid";
  }
}

export default async function OrderStatusPage({ params, searchParams }: PageProps<"/[market]/objednavka/[id]">) {
  const { market, t } = await getMarketContext();
  const { id } = await params;
  const query = await searchParams;
  const order = await getOrder(id);
  if (!order || order.market !== market.code) notFound();
  if (!(await hasProjectSession(order.projectId))) notFound();

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, order.projectId) });
  const errorKey = typeof query.chyba === "string" ? (query.chyba as MessageKey) : undefined;
  const complaintSent = query.reklamacia === "1";

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-10">
      <StepTitle title={t("order.status.title")} subtitle={t("order.number", { ref: orderRefOf(order) })} />

      <Notice tone={order.status === "cancelled" || order.status === "refunded" ? "warn" : "ok"}>{t(statusKey(order.status, project?.status))}</Notice>

      {order.status !== "pending_payment" && (
        <div className="flex flex-wrap gap-3">
          <a href={`/${market.code}/objednavka/${order.id}/ebook`} className={buttonClass("secondary")}>
            {t("thanks.download_ebook")}
          </a>
          {project && (
            <Link href={`/${market.code}/kosik?projekt=${project.id}`} className={buttonClass("secondary")}>
              {t("personal.reorder")}
            </Link>
          )}
        </div>
      )}

      {errorKey && <Notice tone="error">{t(errorKey)}</Notice>}
      {complaintSent ? (
        <Notice tone="ok">{t("complaint.received")}</Notice>
      ) : (
        <details className="rounded-2xl border-2 border-ink/10 bg-white p-4">
          <summary className="cursor-pointer font-semibold text-ink">{t("complaint.cta")}</summary>
          <p className="mt-2 text-sm text-ink/60">{t("complaint.types")}</p>
          <form action={submitComplaintAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="market" value={market.code} />
            <Field label={t("complaint.cta")} htmlFor="type">
              <select id="type" name="type" className={inputClass} defaultValue={COMPLAINT_TYPES[0]}>
                {COMPLAINT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`complaint.type.${type}` as MessageKey)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("complaint.message")} htmlFor="message">
              <textarea id="message" name="message" required rows={4} className={inputClass.replace("min-h-12", "min-h-24 py-3")} />
            </Field>
            <button type="submit" className={buttonClass("primary", "self-start")}>
              {t("complaint.submit")}
            </button>
          </form>
        </details>
      )}
    </main>
  );
}

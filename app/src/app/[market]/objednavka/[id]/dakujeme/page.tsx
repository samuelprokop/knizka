import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db, schema } from "@/db";
import { getOrder, orderRefOf } from "@/features/checkout/server/orders";
import { nameContextOf } from "@/features/configurator/server/bundle";
import { buttonClass, StepTitle } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import { getMarketContext } from "@/i18n/server";
import { ShopHeader } from "@/components/ShopHeader";

export default async function ThanksPage({ params }: PageProps<"/[market]/objednavka/[id]/dakujeme">) {
  const { market, t } = await getMarketContext();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || order.market !== market.code) notFound();
  if (!(await hasProjectSession(order.projectId))) notFound();
  if (order.status === "pending_payment") redirect(`/${market.code}/kosik?projekt=${order.projectId}`);

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, order.projectId) });
  const hero = await db.query.characters.findFirst({
    where: and(eq(schema.characters.projectId, order.projectId), eq(schema.characters.role, "hero")),
  });
  if (!project || !hero) notFound();
  const heroName = nameContextOf(hero);

  return (
    <>
      <ShopHeader />
      <main className="mx-auto flex w-full flex-1 max-w-xl flex-col justify-center gap-6 px-4 py-16 text-center">
      <StepTitle title={t("thanks.title", undefined, heroName)} subtitle={t("thanks.ebook")} />
      <p className="text-sm text-ink/60">{t("order.number", { ref: orderRefOf(order) })}</p>
      <div className="flex flex-col items-center gap-3">
        <a href={`/${market.code}/objednavka/${order.id}/ebook`} className={buttonClass("primary")}>
          {t("thanks.download_ebook")}
        </a>
        <Link href={`/${market.code}/objednavka/${order.id}`} className={buttonClass("secondary")}>
          {t("thanks.view_order")}
        </Link>
        <Link href={`/${market.code}/moja-kniha/${project.personalToken}`} className={buttonClass("ghost")}>
          {t("thanks.personal_page")}
        </Link>
      </div>
      </main>
    </>
  );
}

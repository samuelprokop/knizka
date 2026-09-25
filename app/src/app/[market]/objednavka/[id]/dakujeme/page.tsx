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
import { BookIcon, ChevronRightIcon, HomeIcon, PlusIcon } from "@/components/icons";

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
  const printed = order.variant === "print_ebook";

  return (
    <>
      <ShopHeader />
      <main className="mx-auto flex w-full flex-1 max-w-xl flex-col justify-center gap-6 px-4 py-8 text-center">
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
      {/* Ponuka po nákupe (peak-end): najľahšie ďalšie „áno“ – tá istá kniha znova, bez nastavovania. */}
      <a
        href={`/${market.code}/moja-kniha/${project.personalToken}/objednat`}
        className="group flex items-center gap-3 rounded-2xl bg-paper p-4 text-left ring-1 ring-ink/10 outline-none transition hover:ring-ink/25 focus-visible:ring-4 focus-visible:ring-brand-orange/40"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/12 text-brand-orange-dark">
          <BookIcon />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-ink">{t(printed ? "thanks.upsell.copy.title" : "thanks.upsell.print.title")}</span>
          <span className="text-sm text-ink/65">{t(printed ? "thanks.upsell.copy.text" : "thanks.upsell.print.text")}</span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none" />
      </a>
      {/* Koniec nákupu: tiché odkazy ďalej (hlavná akcia ostáva stiahnutie e-knihy). */}
      <nav aria-label={t("thanks.more")} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-ink/10 pt-5 text-sm">
        <Link href={`/${market.code}/vytvorit`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-brand-orange-dark underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40">
          <PlusIcon className="size-4" />
          {t("thanks.another_book")}
        </Link>
        <Link href={`/${market.code}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ink/70 underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40">
          <HomeIcon className="size-4" />
          {t("thanks.home")}
        </Link>
      </nav>
      </main>
    </>
  );
}

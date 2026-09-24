import { notFound } from "next/navigation";
import Link from "next/link";

import { formatMoney } from "@/config/markets";
import { computePrice, type PriceSelection } from "@/domain/pricing";
import { PlanCards, type Plan } from "@/features/checkout/components/PlanCards";
import { loadCart } from "@/features/checkout/server/cart";
import { computeOrderPrice } from "@/features/checkout/pricing";
import { validateVoucherCode } from "@/features/checkout/voucher";
import { SessionExpired } from "@/features/configurator/components/SessionExpired";
import { buttonClass, inputClass, Notice, StepTitle } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import { stepHref } from "@/features/configurator/steps";
import type { MessageKey } from "@/i18n/messages";
import { getMarketContext } from "@/i18n/server";

/*
  Košík sa nikde neukladá – voľby (variant, ďalšie výtlačky, darčekové balenie,
  kód) idú v URL, takže sa dajú zdieľať/obnoviť a stránka len prepočíta cenu
  (K10: „zmení knihu → položka sa aktualizuje“). Bez JS funguje cez GET formuláre.
*/

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CartPage({ params, searchParams }: PageProps<"/[market]/kosik">) {
  const { market, t } = await getMarketContext();
  await params;
  const query = await searchParams;
  const projectId = readParam(query.projekt);
  if (!projectId) notFound();
  if (!(await hasProjectSession(projectId))) return <SessionExpired projectId={projectId} />;

  const cart = await loadCart(projectId);
  if (!cart || cart.market !== market.code) notFound();

  const variant: PriceSelection["variant"] = readParam(query.variant) === "ebook" ? "ebook" : "print_ebook";
  const isPrint = variant === "print_ebook";
  const extraCopies = isPrint ? Math.max(0, Math.min(Number(readParam(query.extraCopies)) || 0, 20)) : 0;
  const giftWrap = isPrint && readParam(query.giftWrap) === "1";
  const voucherCode = readParam(query.voucher) ?? "";

  const selection: PriceSelection = {
    variant,
    storyPath: cart.storyPath,
    extraCharacters: cart.extraCharacters,
    pageCount: cart.pageCount,
    format: cart.format,
    coloringBook: cart.coloringBook,
    extraCopies,
    giftWrap,
  };
  const price = computeOrderPrice(selection, market, { carrierId: null, voucherCode });
  const voucherResult = voucherCode.trim() ? validateVoucherCode(voucherCode, market.code) : null;

  const base = `/${market.code}/kosik`;
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode, ...over });
    return `${base}?${p}`;
  };
  const checkoutHref = `/${market.code}/objednavka?${new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode })}`;

  const lines = [
    { id: price.base.id, quantity: price.base.quantity, amountMinor: price.base.amountMinor },
    ...price.surcharges,
  ];
  const shippingCarrierName = isPrint ? (market.carriers[0]?.name ?? "") : "";

  // Cena variantu bez doplnkov (výtlačky, balenie) – porovnanie v kartách.
  const planPrice = (v: PriceSelection["variant"]) =>
    formatMoney(computePrice({ ...selection, variant: v, extraCopies: 0, giftWrap: false }, market).totalMinor, market);
  const cheapestShipping = Math.min(...market.carriers.map((c) => c.priceMinor));
  const plans: Plan[] = [
    {
      id: "ebook",
      name: t("cart.plan.ebook.name"),
      description: t("cart.plan.ebook.desc"),
      price: planPrice("ebook"),
      unit: t("cart.plan.ebook.unit"),
      features: [t("cart.plan.ebook.f1"), t("cart.plan.ebook.f2"), t("cart.plan.ebook.f3"), t("cart.plan.ebook.f4")],
      href: qs({ variant: "ebook", extraCopies: "0", giftWrap: "0" }),
      selected: !isPrint,
      recommended: false,
    },
    {
      id: "print_ebook",
      name: t("cart.plan.print.name"),
      description: t("cart.plan.print.desc"),
      price: planPrice("print_ebook"),
      unit: t("cart.plan.print.unit"),
      priceNote: t("cart.plan.print.shipping", { price: formatMoney(cheapestShipping, market) }),
      features: [
        t("cart.plan.print.f1", { format: t(`book.format.${cart.format}` as MessageKey) }),
        t("cart.plan.print.f2"),
        t("cart.plan.print.f3"),
        t("cart.plan.print.f4", { days: market.deliveryWorkingDays }),
        t("cart.plan.print.f5"),
      ],
      href: qs({ variant: "print_ebook" }),
      selected: isPrint,
      recommended: true,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-10">
      <StepTitle title={t(cart.reorder ? "cart.reorder.title" : "cart.title")} />

      <section className="flex gap-4 rounded-2xl border-2 border-ink/10 bg-white p-4">
        {cart.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- podpísaná URL, nie next/image doména
          <img src={cart.thumbnailUrl} alt="" className="h-32 w-24 shrink-0 rounded-lg object-cover" />
        ) : null}
        <div className="flex flex-col gap-1">
          <p className="font-heading text-lg font-bold text-ink">{t("cart.item", { title: cart.bookTitle }, cart.hero)}</p>
          <p className="text-sm text-ink/70">{t("cart.delivery_promise")}</p>
        </div>
      </section>

      {!cart.reorder && <PlanCards plans={plans} t={t} />}

      {isPrint && (
        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3">
            <span className="text-base text-ink">{t("cart.addon.copy")}</span>
            <div className="flex items-center gap-3">
              <Link href={qs({ extraCopies: String(Math.max(0, extraCopies - 1)) })} className={buttonClass("secondary", "min-h-9 min-w-9 px-0")} aria-label="−">
                −
              </Link>
              <span className="w-4 text-center font-semibold text-ink">{extraCopies}</span>
              <Link href={qs({ extraCopies: String(Math.min(20, extraCopies + 1)) })} className={buttonClass("secondary", "min-h-9 min-w-9 px-0")} aria-label="+">
                +
              </Link>
            </div>
          </div>
          <Link
            href={qs({ giftWrap: giftWrap ? "0" : "1" })}
            aria-pressed={giftWrap}
            className={buttonClass(giftWrap ? "primary" : "secondary", "justify-between")}
          >
            {t("cart.addon.giftwrap")}
          </Link>
        </fieldset>
      )}

      <form method="get" action={base} className="flex flex-col gap-2">
        <input type="hidden" name="projekt" value={projectId} />
        <input type="hidden" name="variant" value={variant} />
        <input type="hidden" name="extraCopies" value={extraCopies} />
        <input type="hidden" name="giftWrap" value={giftWrap ? "1" : "0"} />
        <label className="text-sm font-semibold text-ink" htmlFor="voucher">
          {t("cart.code")}
        </label>
        <div className="flex gap-2">
          <input id="voucher" name="voucher" defaultValue={voucherCode} className={inputClass} placeholder={t("voucher.enter")} />
          <button type="submit" className={buttonClass("secondary")}>
            {t("cart.voucher.apply")}
          </button>
        </div>
        {voucherResult?.ok && (
          <Notice tone="ok">{t("cart.voucher.applied", { code: voucherResult.code, amount: formatMoney(-(price.discount?.amountMinor ?? 0), market) })}</Notice>
        )}
        {voucherResult && !voucherResult.ok && voucherResult.reason === "wrong_market" && (
          <Notice tone="warn">{t("voucher.wrong_market", { country: market.code.toUpperCase() })}</Notice>
        )}
        {voucherResult && !voucherResult.ok && voucherResult.reason === "not_found" && <Notice tone="warn">{t("cart.voucher.invalid")}</Notice>}
      </form>

      <section className="flex flex-col gap-2 rounded-2xl border-2 border-ink/10 bg-white p-4">
        {lines.map((line) => (
          <div key={line.id} className="flex justify-between text-sm text-ink/80">
            <span>{t(`configurator.price.${line.id}` as MessageKey, { n: line.quantity })}</span>
            <span>{formatMoney(line.amountMinor, market)}</span>
          </div>
        ))}
        {price.shipping && (
          <div className="flex justify-between text-sm text-ink/80">
            <span>{t("checkout.price.shipping", { carrier: shippingCarrierName })}</span>
            <span>{formatMoney(price.shipping.amountMinor, market)}</span>
          </div>
        )}
        {price.discount && (
          <div className="flex justify-between text-sm text-[#2e7d32]">
            <span>{t("checkout.price.discount", { code: voucherResult?.ok ? voucherResult.code : "" })}</span>
            <span>{formatMoney(price.discount.amountMinor, market)}</span>
          </div>
        )}
        <div className="mt-2 border-t border-ink/10 pt-2 text-right font-heading text-lg font-bold text-ink">
          {t("checkout.total", { price: formatMoney(price.totalMinor, market) })}
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-between">
        <Link href={cart.reorder ? `/${market.code}/moja-kniha/${cart.personalToken}` : stepHref(market.code, projectId, 9)} className={buttonClass("ghost")}>
          {t("cart.back_to_book")}
        </Link>
        <Link href={checkoutHref} className={buttonClass("primary")}>
          {t("cart.continue")}
        </Link>
      </div>
    </main>
  );
}

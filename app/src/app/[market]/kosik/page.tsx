import { notFound } from "next/navigation";
import Link from "next/link";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { GoBackButton, MotionCta } from "@/components/buttons";
import { formatMoney } from "@/config/markets";
import { computePrice, type PriceSelection } from "@/domain/pricing";
import { PlanCards, type Plan } from "@/features/checkout/components/PlanCards";
import { CouponReveal } from "@/features/checkout/components/CouponReveal";
import { RemoveFromCart } from "@/features/checkout/components/RemoveFromCart";
import { VoucherDialog } from "@/features/checkout/components/VoucherDialog";
import { CartOverview } from "@/features/checkout/components/CartOverview";
import { loadCart, sessionCart } from "@/features/checkout/server/cart";
import { computeOrderPrice, freeShippingGapMinor } from "@/features/checkout/pricing";
import { estimatedDelivery, formatDeliveryDate } from "@/domain/delivery";
import { validateVoucherCode } from "@/features/checkout/voucher";
import { SessionExpired } from "@/features/configurator/components/SessionExpired";
import { StepTitle } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import { stepHref } from "@/features/configurator/steps";
import type { MessageKey } from "@/i18n/messages";
import { getMarketContext } from "@/i18n/server";
import { pluralForm } from "@/i18n/plural";
import { ShopHeader } from "@/components/ShopHeader";
import { MinusIcon, PlusIcon } from "@/components/icons";

/*
  Košík sa nikde neukladá – voľby (variant, ďalšie výtlačky, darčekové balenie,
  kód) idú v URL, takže sa dajú zdieľať/obnoviť a stránka len prepočíta cenu
  (K10: „zmení knihu → položka sa aktualizuje“). Bez JS funguje cez GET formuláre.
*/

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

/** Značka miesta pre sumu v preloženom texte („Celkom: {price}“ → text pred a za sumou). */
const SLOT = "\u0000";
function splitAround(text: string) {
  const [prefix = "", suffix = ""] = text.split(SLOT);
  return { prefix, suffix };
}

export default async function CartPage({ params, searchParams }: PageProps<"/[market]/kosik">) {
  const { market, t } = await getMarketContext();
  await params;
  const query = await searchParams;
  const projectId = readParam(query.projekt);
  // Bez projektu: prehľad všetkých kníh v košíku na tomto zariadení.
  if (!projectId) return <CartOverview market={market} t={t} items={await sessionCart(market.code)} />;
  if (!(await hasProjectSession(projectId))) return <SessionExpired projectId={projectId} />;

  const cart = await loadCart(projectId);
  if (!cart || cart.market !== market.code) notFound();
  const others = (await sessionCart(market.code)).filter((c) => c.projectId !== projectId).length;

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
  // Úvodná zľava novej značky – nálepka sa ukáže, kým na objednávke nie je platný kód (jeden kód na objednávku).
  const launch = market.launchVoucherCode ? validateVoucherCode(market.launchVoucherCode, market.code) : null;
  const launchOffer = launch?.ok && launch.kind === "percent" ? { code: launch.code, percent: launch.percent } : null;

  const base = `/${market.code}/kosik`;
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode, ...over });
    return `${base}?${p}`;
  };
  const backHref = cart.reorder ? `/${market.code}/moja-kniha/${cart.personalToken}` : stepHref(market.code, projectId, 9);
  const checkoutHref = `/${market.code}/objednavka?${new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode })}`;

  const lines = [
    { id: price.base.id, quantity: price.base.quantity, amountMinor: price.base.amountMinor },
    ...price.surcharges,
  ];
  const shippingCarrierName = isPrint ? (market.carriers[0]?.name ?? "") : "";
  // Doprava zadarmo od hranice (goal-gradient): koľko chýba a či ju dorovná ďalší výtlačok.
  const shippingGap = freeShippingGapMinor(selection, market);

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
        t("cart.plan.print.f4", { date: formatDeliveryDate(estimatedDelivery(new Date(), market), market) }),
        t("cart.plan.print.f5"),
      ],
      href: qs({ variant: "print_ebook" }),
      selected: isPrint,
      recommended: true,
    },
  ];

  return (
    <>
      <ShopHeader wide home />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-32 lg:pb-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <StepTitle title={t(cart.reorder ? "cart.reorder.title" : "cart.title")} />
          {/* Viac kníh v košíku: odkaz na prehľad (každá sa platí samostatne). */}
          {others > 0 && (
            <Link href={`/${market.code}/kosik`} className="text-sm font-semibold text-brand-orange-dark underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              {t(`cart.overview.others.${pluralForm(others)}`, { n: others })}
            </Link>
          )}
        </div>

        {/* Dva stĺpce od lg: voľby vľavo, súhrn objednávky vpravo (lepí sa pri posúvaní). */}
        <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
          <section className="flex gap-4 rounded-2xl border-2 border-ink/10 bg-white p-4 lg:hidden">
            {cart.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- podpísaná URL, nie next/image doména
              <img src={cart.thumbnailUrl} alt="" className="h-32 w-24 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-heading text-lg font-bold text-ink">{t("cart.item", { title: cart.bookTitle }, cart.hero)}</p>
              <p className="text-sm text-ink/70">{t("cart.delivery_promise")}</p>
            </div>
            {!cart.reorder && <RemoveFromCart projectIds={[projectId]} title={cart.bookTitle} />}
          </section>
            {!cart.reorder && <PlanCards plans={plans} t={t} />}
          </div>

          <aside aria-labelledby="cart-summary" className="flex flex-col gap-2.5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink/10 lg:sticky lg:top-6">
            <h2 id="cart-summary" className="sr-only">{t("cart.summary")}</h2>
            <div className="hidden gap-3 lg:flex">
              {cart.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- podpísaná URL, nie next/image doména
                <img src={cart.thumbnailUrl} alt="" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
              ) : null}
              {/* Dlhý názov knihy na 2 riadky (celý v title) – súhrn sa zmestí bez posúvania;
                  sľub doručenia je pri tlačenej knihe vľavo, tu by sa opakoval. */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p title={t("cart.item", { title: cart.bookTitle }, cart.hero)} className="line-clamp-2 font-heading text-base leading-snug font-bold text-ink">
                  {cart.bookTitle}
                </p>
                <p className="truncate text-xs text-ink/65">{t("cart.item.for", undefined, cart.hero)}</p>
              </div>
              {!cart.reorder && <RemoveFromCart projectIds={[projectId]} title={cart.bookTitle} />}
            </div>
            {isPrint && (
              <div className="flex flex-col gap-1 border-ink/10 lg:border-t lg:pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">
                    {t("cart.addon.copy_short")} <span className="text-ink/55">+{formatMoney(market.prices.extraCopy, market)}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Link href={qs({ extraCopies: String(Math.max(0, extraCopies - 1)) })} scroll={false} className="flex size-11 items-center justify-center rounded-full text-ink ring-1 ring-ink/15 outline-none hover:ring-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40" aria-label={t("cart.addon.copy_less")}>
                      <MinusIcon className="size-4" />
                    </Link>
                    <AnimatedNumber value={String(extraCopies)} className="w-6 justify-center font-semibold text-ink" />
                    <Link href={qs({ extraCopies: String(Math.min(20, extraCopies + 1)) })} scroll={false} className="flex size-11 items-center justify-center rounded-full text-ink ring-1 ring-ink/15 outline-none hover:ring-ink/35 focus-visible:ring-4 focus-visible:ring-brand-orange/40" aria-label={t("cart.addon.copy_more")}>
                      <PlusIcon className="size-4" />
                    </Link>
                  </div>
                </div>
                <Link
                  href={qs({ giftWrap: giftWrap ? "0" : "1" })}
                  scroll={false}
                  role="switch"
                  aria-checked={giftWrap}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                >
                  <span>
                    {t("cart.addon.giftwrap")} <span className="text-ink/55">+{formatMoney(market.prices.giftWrap, market)}</span>
                  </span>
                  <span aria-hidden className={`relative h-6 w-10 shrink-0 rounded-full transition ${giftWrap ? "bg-brand-orange-dark" : "bg-ink/20"}`}>
                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${giftWrap ? "left-[1.125rem]" : "left-0.5"}`} />
                  </span>
                </Link>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
              {lines.map((line) => (
                <div key={line.id} className="flex justify-between text-sm text-ink/80">
                  <span>{t(`configurator.price.${line.id}` as MessageKey, { n: line.quantity })}</span>
                  <span>{formatMoney(line.amountMinor, market)}</span>
                </div>
              ))}
              {price.shipping && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-sm text-ink/80">
                    <span>{t("checkout.price.shipping", { carrier: shippingCarrierName })}</span>
                    <span className={price.shipping.amountMinor === 0 ? "font-semibold text-[#2e7d32]" : undefined}>
                      {price.shipping.amountMinor === 0 ? t("cart.shipping.free") : formatMoney(price.shipping.amountMinor, market)}
                    </span>
                  </div>
                  {!!shippingGap && (
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 text-xs text-ink/65">
                        {shippingGap <= market.prices.extraCopy && extraCopies === 0
                          ? t("cart.shipping.gap_copy")
                          : t("cart.shipping.gap", { price: formatMoney(shippingGap, market) })}
                      </p>
                      <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-ink/10">
                        <span
                          className="block h-full rounded-full bg-brand-orange transition-[width] duration-500 ease-out motion-reduce:transition-none"
                          style={{ width: `${Math.round((1 - shippingGap / market.freeShippingFromMinor) * 100)}%` }}
                        />
                      </span>
                    </div>
                  )}
                </div>
              )}
              {price.discount && (
                <div className="flex items-center justify-between gap-2 text-sm text-[#2e7d32]">
                  <span className="flex flex-wrap items-center gap-x-2">
                    {t("checkout.price.discount", { code: voucherResult?.ok ? voucherResult.code : "" })}
                    <Link href={qs({ voucher: "" })} scroll={false} className="rounded text-xs text-ink/60 underline underline-offset-4 outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                      {t("cart.voucher.remove")}
                    </Link>
                  </span>
                  <span>{formatMoney(price.discount.amountMinor, market)}</span>
                </div>
              )}
            </div>
            {voucherResult?.ok ? null : (
              <>
              {launchOffer && <CouponReveal code={launchOffer.code} percent={launchOffer.percent} />}
              <VoucherDialog
                action={base}
                hidden={{ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0" }}
                defaultCode={voucherCode}
                error={
                  voucherResult && !voucherResult.ok
                    ? voucherResult.reason === "wrong_market"
                      ? t("voucher.wrong_market", { country: market.code.toUpperCase() })
                      : t("cart.voucher.invalid")
                    : null
                }
              />
              </>
            )}
            <div className="border-t border-ink/10 pt-3 text-right font-heading text-xl font-bold text-ink">
              <AnimatedNumber value={formatMoney(price.totalMinor, market)} {...splitAround(t("checkout.total", { price: SLOT }))} />
            </div>
            <MotionCta href={checkoutHref} className="hidden w-full justify-center text-base lg:inline-flex">
              {t("cart.continue")}
            </MotionCta>
            <GoBackButton href={backHref} className="self-center">
              {t("cart.back_to_book")}
            </GoBackButton>
          </aside>
        </div>
      </main>

      {/* Mobil a tablet: suma a pokračovanie stále po ruke. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <span className="font-heading text-lg font-bold text-ink">
            <AnimatedNumber value={formatMoney(price.totalMinor, market)} />
          </span>
          <MotionCta href={checkoutHref} className="flex-1 justify-center text-base sm:flex-none">
            {t("cart.continue")}
          </MotionCta>
        </div>
      </div>
    </>
  );
}

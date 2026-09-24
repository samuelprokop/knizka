import { notFound } from "next/navigation";
import Link from "next/link";

import { formatMoney } from "@/config/markets";
import type { PriceSelection } from "@/domain/pricing";
import { submitCheckoutAction } from "@/features/checkout/actions";
import { PaymentPanel } from "@/features/checkout/components/PaymentPanel";
import { loadCart } from "@/features/checkout/server/cart";
import { computeOrderPrice } from "@/features/checkout/pricing";
import { SessionExpired } from "@/features/configurator/components/SessionExpired";
import { Field, inputClass, Notice } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import type { MessageKey } from "@/i18n/messages";
import { getMarketContext } from "@/i18n/server";
import { GoBackButton } from "@/components/buttons";
import { ShopHeader } from "@/components/ShopHeader";
import { DeliveryFields } from "@/features/checkout/components/DeliveryFields";
import { InvoiceFields } from "@/features/checkout/components/InvoiceFields";

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CheckoutPage({ searchParams }: PageProps<"/[market]/objednavka">) {
  const { market, t } = await getMarketContext();
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
  const errorKey = readParam(query.chyba) as MessageKey | undefined;

  const carrierId = readParam(query.carrier) ?? market.carriers[0]?.id ?? null;
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
  const price = computeOrderPrice(selection, market, { carrierId: isPrint ? carrierId : null, voucherCode });

  const removeVoucherHref = `/${market.code}/objednavka?${new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === "string" && k !== "voucher" && k !== "chyba" ? [[k, v]] : []))
  )}`;

  const paymentMethods = market.paymentMethods.filter((m) => m !== "cod" || market.codAllowedForPersonalizedBook);
  const cartHref = `/${market.code}/kosik?${new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode })}`;

  return (
    <>
      <ShopHeader wide />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pt-5 pb-10 lg:pb-6">
      <h1 className="font-heading text-[1.75rem] font-extrabold text-ink sm:text-[2.1rem]">{t("checkout.title")}</h1>

      {errorKey && <Notice tone="error">{t(errorKey)}</Notice>}

      <form action={submitCheckoutAction} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10">
        <input type="hidden" name="market" value={market.code} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="bookVersionId" value={cart.bookVersionId} />
        <input type="hidden" name="variant" value={variant} />
        <input type="hidden" name="extraCopies" value={extraCopies} />
        {giftWrap && <input type="hidden" name="giftWrap" value="on" />}
        <input type="hidden" name="voucherCode" value={voucherCode} />

        {/* Vľavo údaje, vpravo súhrn a platba (lepí sa) – bez posúvania. */}
        <div className="flex min-w-0 flex-col gap-4">
        <section className="flex flex-col gap-4">
          <Field label={t("checkout.email")} htmlFor="email">
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={cart.email ?? ""} className={inputClass} />
          </Field>
        </section>

        {isPrint && (
          <section className="flex flex-col gap-4">
            <DeliveryFields
              defaultCarrierId={carrierId}
              carriers={market.carriers.map((c) => ({
                id: c.id,
                name: c.name,
                price: formatMoney(price.totalMinor >= market.freeShippingFromMinor ? 0 : c.priceMinor, market),
                pickupPoint: c.pickupPoint,
              }))}
            />
          </section>
        )}

        <InvoiceFields />
          <GoBackButton href={cartHref} className="self-start">
            {t("checkout.back_to_cart")}
          </GoBackButton>
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-4">

        <section className="flex flex-col gap-1.5 rounded-2xl bg-white p-4 ring-1 ring-ink/10">
          <p className="mb-1 text-sm font-semibold text-ink">{t("cart.item", { title: cart.bookTitle }, cart.hero)}</p>
          {[{ id: price.base.id, quantity: price.base.quantity, amountMinor: price.base.amountMinor }, ...price.surcharges].map((line) => (
            <div key={line.id} className="flex justify-between text-sm text-ink/80">
              <span>{t(`configurator.price.${line.id}` as MessageKey, { n: line.quantity })}</span>
              <span>{formatMoney(line.amountMinor, market)}</span>
            </div>
          ))}
          {price.shipping && (
            <div className="flex justify-between text-sm text-ink/80">
              <span>{t("checkout.price.shipping", { carrier: market.carriers.find((c) => c.id === carrierId)?.name ?? "" })}</span>
              <span>{formatMoney(price.shipping.amountMinor, market)}</span>
            </div>
          )}
          {price.discount && (
            <div className="flex items-center justify-between gap-2 text-sm text-[#2e7d32]">
              <span className="flex flex-wrap items-center gap-x-2">
                {t("checkout.price.discount", { code: voucherCode })}
                {/* Kód sa dá zrušiť (napr. kvôli lepšiemu) – ostatné voľby v URL zostanú. */}
                <Link href={removeVoucherHref} replace scroll={false} className="rounded text-xs text-ink/60 underline underline-offset-4 outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-brand-orange/40">
                  {t("cart.voucher.remove")}
                </Link>
              </span>
              <span>{formatMoney(price.discount.amountMinor, market)}</span>
            </div>
          )}
          <div className="mt-1.5 border-t border-ink/10 pt-2 text-right text-lg font-semibold text-ink tabular-nums">
            {t("checkout.total", { price: formatMoney(price.totalMinor, market) })}
          </div>
        </section>

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="termsAccepted" required className="size-5 shrink-0 accent-brand-orange-dark" />
          <span className="text-sm text-ink">{t("checkout.terms")}</span>
        </label>

        <PaymentPanel methods={paymentMethods} total={formatMoney(price.totalMinor, market)} t={t} cardOpen={readParam(query.karta) === "1"} compact />
        </div>
      </form>
      </main>
    </>
  );
}

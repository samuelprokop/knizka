import { notFound } from "next/navigation";
import Link from "next/link";

import { formatMoney } from "@/config/markets";
import type { PriceSelection } from "@/domain/pricing";
import { submitCheckoutAction } from "@/features/checkout/actions";
import { PaymentPanel } from "@/features/checkout/components/PaymentPanel";
import { loadCart } from "@/features/checkout/server/cart";
import { computeOrderPrice } from "@/features/checkout/pricing";
import { SessionExpired } from "@/features/configurator/components/SessionExpired";
import { buttonClass, Field, inputClass, Notice } from "@/features/configurator/components/ui";
import { hasProjectSession } from "@/features/configurator/server/session";
import type { MessageKey } from "@/i18n/messages";
import { getMarketContext } from "@/i18n/server";
import { ShopHeader } from "@/components/ShopHeader";
import { DeliveryFields } from "@/features/checkout/components/DeliveryFields";

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

  const paymentMethods = market.paymentMethods.filter((m) => m !== "cod" || market.codAllowedForPersonalizedBook);
  const cartHref = `/${market.code}/kosik?${new URLSearchParams({ projekt: projectId, variant, extraCopies: String(extraCopies), giftWrap: giftWrap ? "1" : "0", voucher: voucherCode })}`;

  return (
    <>
      <ShopHeader />
      <main className="mx-auto flex w-full flex-1 max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-[1.75rem] font-extrabold text-ink sm:text-4xl">{t("checkout.title")}</h1>
        <p className="text-base text-ink/70">{t("cart.item", { title: cart.bookTitle }, cart.hero)}</p>
      </header>

      {errorKey && <Notice tone="error">{t(errorKey)}</Notice>}

      <form action={submitCheckoutAction} className="flex flex-col gap-8">
        <input type="hidden" name="market" value={market.code} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="bookVersionId" value={cart.bookVersionId} />
        <input type="hidden" name="variant" value={variant} />
        <input type="hidden" name="extraCopies" value={extraCopies} />
        {giftWrap && <input type="hidden" name="giftWrap" value="on" />}
        <input type="hidden" name="voucherCode" value={voucherCode} />

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-bold text-ink">{t("checkout.contact")}</h2>
          <Field label={t("checkout.email")} htmlFor="email">
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={cart.email ?? ""} className={inputClass} />
          </Field>
        </section>

        {isPrint && (
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-bold text-ink">{t("checkout.shipping")}</h2>
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

        {/* Údaje firmy sa ukážu až po zaškrtnutí (čisté CSS – funguje aj bez JS). */}
        <section className="group/invoice flex flex-col gap-3">
          <label className="flex min-h-12 cursor-pointer items-center gap-3">
            <input type="checkbox" name="invoiceToggle" id="invoiceToggle" className="size-6 accent-brand-orange-dark" />
            <span className="text-base text-ink">{t("checkout.invoice.toggle")}</span>
          </label>
          <div className="hidden flex-col gap-4 group-has-[#invoiceToggle:checked]/invoice:flex">
            <Field label={t("checkout.invoice.company")} htmlFor="invoiceCompanyName">
              <input id="invoiceCompanyName" name="invoiceCompanyName" autoComplete="organization" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("checkout.invoice.ico")} htmlFor="invoiceIco">
                <input id="invoiceIco" name="invoiceIco" inputMode="numeric" className={inputClass} />
              </Field>
              <Field label={t("checkout.invoice.dic")} htmlFor="invoiceDic">
                <input id="invoiceDic" name="invoiceDic" className={inputClass} />
              </Field>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border-2 border-ink/10 bg-white p-4">
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
            <div className="flex justify-between text-sm text-[#2e7d32]">
              <span>{t("checkout.price.discount", { code: voucherCode })}</span>
              <span>{formatMoney(price.discount.amountMinor, market)}</span>
            </div>
          )}
          <div className="mt-2 border-t border-ink/10 pt-2 text-right text-lg font-semibold text-ink tabular-nums">
            {t("checkout.total", { price: formatMoney(price.totalMinor, market) })}
          </div>
        </section>

        <label className="flex min-h-12 cursor-pointer items-start gap-3">
          <input type="checkbox" name="termsAccepted" required className="mt-0.5 size-6 shrink-0 accent-brand-orange-dark" />
          <span className="text-base text-ink">{t("checkout.terms")}</span>
        </label>

        <PaymentPanel methods={paymentMethods} total={formatMoney(price.totalMinor, market)} t={t} cardOpen={readParam(query.karta) === "1"} />

        <Link href={cartHref} className={buttonClass("ghost", "self-start")}>
          {t("checkout.back_to_cart")}
        </Link>
      </form>
      </main>
    </>
  );
}

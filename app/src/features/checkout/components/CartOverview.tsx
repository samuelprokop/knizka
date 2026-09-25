import Link from "next/link";

import { MotionCta, NextArrow } from "@/components/buttons";
import { PlusIcon } from "@/components/icons";
import { ShopHeader } from "@/components/ShopHeader";
import { formatMoney, type Market } from "@/config/markets";
import { computePrice } from "@/domain/pricing";
import { buttonClass, StepTitle } from "@/features/configurator/components/ui";
import { pluralForm } from "@/i18n/plural";
import type { Translator } from "@/i18n/format";
import type { CartView } from "../server/cart";
import { RemoveFromCart } from "./RemoveFromCart";

/*
  Prehľad košíka (/kosik bez projektu): všetky schválené knihy na tomto zariadení.
  Každá kniha sa platí samostatne (vlastná tlač, doprava a e-kniha), preto má vlastné
  „Pokračovať k platbe“; knihy sa dajú odstrániť jednotlivo aj všetky naraz.
*/
export function CartOverview({ market, t, items }: { market: Market; t: Translator; items: CartView[] }) {
  const priceOf = (c: CartView) =>
    computePrice(
      { variant: "print_ebook", storyPath: c.storyPath, extraCharacters: c.extraCharacters, pageCount: c.pageCount, format: c.format, coloringBook: c.coloringBook, extraCopies: 0, giftWrap: false },
      market
    ).totalMinor;

  return (
    <>
      <ShopHeader wide />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <StepTitle
            title={t("cart.title")}
            subtitle={items.length ? t(`cart.overview.count.${pluralForm(items.length)}`, { n: items.length }) : t("cart.overview.empty")}
          />
          {items.length > 1 && <RemoveFromCart all after="refresh" projectIds={items.map((i) => i.projectId)} title={t("cart.title")} />}
        </div>

        {items.length === 0 ? (
          <MotionCta href={`/${market.code}/vytvorit`} className="self-start text-base">
            {t("footer.cta")}
          </MotionCta>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.projectId} className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/10 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- podpísaná URL, nie next/image doména
                    <img src={item.thumbnailUrl} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span aria-hidden className="h-20 w-16 shrink-0 rounded-lg bg-paper" />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="line-clamp-2 font-heading text-lg leading-snug font-bold text-ink">{item.bookTitle}</p>
                    <p className="truncate text-sm text-ink/65">{t("cart.item.for", undefined, item.hero)}</p>
                    <p className="text-sm font-semibold text-ink tabular-nums">{t("cart.overview.from", { price: formatMoney(priceOf(item), market) })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <RemoveFromCart after="refresh" projectIds={[item.projectId]} title={item.bookTitle} />
                  <Link href={`/${market.code}/kosik?projekt=${item.projectId}`} className={buttonClass("next", "flex-1 sm:flex-none")}>
                    {t("cart.continue")}
                    <NextArrow />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <Link href={`/${market.code}/vytvorit`} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-2 text-sm font-semibold text-brand-orange-dark underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand-orange/40">
            <PlusIcon className="size-4" />
            {t("thanks.another_book")}
          </Link>
        )}
      </main>
    </>
  );
}

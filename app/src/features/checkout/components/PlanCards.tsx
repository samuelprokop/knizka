import Link from "next/link";

import type { Translator } from "@/i18n/format";

/*
  Výber variantu v košíku – podľa „Two-Plan Pricing Cards“ (lndev-ui, 21st.dev,
  MIT): dve karty vedľa seba, tlačená kniha odporúčaná. Karty sú odkazy (košík
  drží voľby v URL), zvolená má oranžový rámik a tlačidlo „Vybrané“.
  Na mobile ide odporúčaná karta prvá.
*/

export type Plan = {
  id: "ebook" | "print_ebook";
  name: string;
  description: string;
  price: string;
  unit: string;
  /** Poznámka pod cenou (napr. doprava). */
  priceNote?: string;
  features: string[];
  href: string;
  selected: boolean;
  recommended: boolean;
};

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

export function PlanCards({ plans, t }: { plans: Plan[]; t: Translator }) {
  return (
    <section aria-labelledby="plans-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center lg:text-left">
        <h2 id="plans-title" className="font-heading text-2xl font-extrabold text-ink">
          {t("cart.plans.title")}
        </h2>
        <p className="text-sm text-ink/65">{t("cart.plans.subtitle")}</p>
      </div>

      <div className="grid gap-5 pt-3 sm:grid-cols-2 sm:gap-4">
        {plans.map((plan) => (
          <article
            key={plan.id}
            aria-labelledby={`plan-${plan.id}`}
            className={cx(
              "relative flex flex-col rounded-3xl bg-white p-5 transition-shadow",
              plan.selected ? "shadow-lg shadow-brand-orange/10 ring-2 ring-brand-orange" : "ring-1 ring-ink/10",
              plan.recommended ? "order-first sm:order-last" : ""
            )}
          >
            {plan.recommended && (
              <span className="absolute -top-3 left-6 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                {t("cart.plan.recommended")}
              </span>
            )}

            <h3 id={`plan-${plan.id}`} className="font-heading text-xl font-extrabold text-ink">
              {plan.name}
            </h3>
            <p className="mt-1 text-sm text-ink/65">{plan.description}</p>

            <div className="my-4 border-y border-ink/10 py-3">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-heading text-3xl font-extrabold text-ink">{plan.price}</span>
                <span className="text-sm text-ink/60">{plan.unit}</span>
              </p>
              {plan.priceNote && <p className="mt-1 text-sm text-ink/60">{plan.priceNote}</p>}
            </div>

            <ul className="mb-5 flex flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-ink">
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              scroll={false}
              aria-current={plan.selected ? "true" : undefined}
              className={cx(
                "mt-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40 active:scale-[0.98] motion-reduce:active:scale-100",
                plan.selected
                  ? "bg-brand-orange/15 text-ink"
                  : plan.recommended
                    ? "bg-ink text-white hover:bg-ink/85"
                    : "bg-white text-ink shadow-sm ring-1 ring-ink/15 hover:bg-ink/[0.03]"
              )}
            >
              {plan.selected ? (
                <>
                  <CheckIcon />
                  {t("cart.plan.chosen")}
                </>
              ) : (
                <>
                  {t("cart.plan.choose")}
                  <ArrowIcon />
                </>
              )}
            </Link>
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-ink/60">{t("cart.plans.note")}</p>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 size-4 shrink-0 text-brand-orange-dark">
      <path d="m3 8.5 3.2 3L13 4.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

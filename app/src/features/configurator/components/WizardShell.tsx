import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatMoney, type Market } from "@/config/markets";
import { computePrice } from "@/domain/pricing";
import type { Translator } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";
import type { NameContext } from "@/lib/language";
import { priceSelection, type PriceInputs } from "../pricing";
import { PROGRESS_STEPS, progressIndex, stepHref, type StepNumber } from "../steps";
import { SaveExitButton } from "./SaveExitButton";
import { cx } from "./ui";
import { WizardProvider, type PriceView } from "./WizardContext";

export function priceView(market: Market, t: Translator, inputs: PriceInputs): PriceView {
  const price = computePrice(priceSelection(inputs), market);
  const line = (id: string, quantity: number, amount: number) => ({
    label: t(`configurator.price.${id}` as MessageKey, { n: quantity }),
    amount: formatMoney(amount, market),
  });
  return {
    total: formatMoney(price.totalMinor, market),
    lines: [line(price.base.id, 1, price.base.amountMinor), ...price.surcharges.map((s) => line(s.id, s.quantity, s.amountMinor))],
  };
}

export function WizardShell({
  market,
  t,
  step,
  projectId,
  maxStep,
  price,
  hero,
  bookLanguage,
  notice,
  children,
}: {
  market: Market;
  t: Translator;
  step: StepNumber;
  projectId: string | null;
  /** Najvyšší krok, na ktorý sa dá v lište skočiť. */
  maxStep: StepNumber;
  price: PriceView;
  hero: NameContext | null;
  bookLanguage: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const current = progressIndex(step);
  const title = PROGRESS_STEPS[current - 1] ?? PROGRESS_STEPS[PROGRESS_STEPS.length - 1];

  return (
    <WizardProvider value={{ market: market.code, projectId, price, hero, bookLanguage }}>
      <div className="flex min-h-dvh flex-col bg-paper">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <Link href={`/${market.code}`} aria-label="TAKTIK" className="rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40">
              <Image src="/brand/taktik-logo.svg" alt="TAKTIK" width={40} height={36} unoptimized />
            </Link>
            {projectId && <SaveExitButton projectId={projectId} />}
          </div>
          <nav aria-label={t("configurator.progress.label")} className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
            <p className="text-sm font-medium text-ink/70">
              {t("common.progress.step", { n: current, total: PROGRESS_STEPS.length, title: t(title.progressKey) })}
            </p>
            <ol className="mt-2 grid grid-cols-8 gap-1">
              {PROGRESS_STEPS.map((s, i) => {
                const index = i + 1;
                const reachable = !!projectId && s.n <= maxStep && index !== current;
                const bar = cx(
                  "block h-2 rounded-full",
                  index < current ? "bg-brand-orange-dark" : index === current ? "bg-brand-orange" : "bg-ink/12"
                );
                return (
                  <li key={s.slug}>
                    {reachable ? (
                      <Link
                        href={stepHref(market.code, projectId!, s.n)}
                        className="block py-2 outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/40"
                        aria-label={t("common.progress.step", { n: index, total: PROGRESS_STEPS.length, title: t(s.progressKey) })}
                      >
                        <span className={bar} />
                      </Link>
                    ) : (
                      <span className="block py-2" aria-current={index === current ? "step" : undefined}>
                        <span className={bar} />
                        <span className="sr-only">{t(s.progressKey)}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 sm:px-6">
          {notice}
          {children}
        </main>
      </div>
    </WizardProvider>
  );
}
